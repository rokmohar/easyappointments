<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.4.0
 * ---------------------------------------------------------------------------- */

require_once __DIR__ . '/../../system/libraries/Migration.php';

/**
 * Easy!Appointments migration.
 *
 * @property EA_Benchmark $benchmark
 * @property EA_Cache $cache
 * @property EA_Calendar $calendar
 * @property EA_Config $config
 * @property EA_DB_forge $dbforge
 * @property EA_DB_query_builder $db
 * @property EA_DB_utility $dbutil
 * @property EA_Email $email
 * @property EA_Encrypt $encrypt
 * @property EA_Encryption $encryption
 * @property EA_Exceptions $exceptions
 * @property EA_Hooks $hooks
 * @property EA_Input $input
 * @property EA_Lang $lang
 * @property EA_Loader $load
 * @property EA_Log $log
 * @property EA_Migration $migration
 * @property EA_Output $output
 * @property EA_Profiler $profiler
 * @property EA_Router $router
 * @property EA_Security $security
 * @property EA_Session $session
 * @property EA_Upload $upload
 * @property EA_URI $uri
 */
class EA_Migration extends CI_Migration
{
    /**
     * @var string
     */
    protected $_custom_migration_table = "migrations_custom";

    /**
     * Initialize Migration Class
     *
     * @param array $config
     * @return void
     */
    public function __construct($config = array())
    {
        parent::__construct($config);
        
        // Create custom migrations table if it doesn't exist
        if (!$this->db->table_exists($this->_custom_migration_table)) {
            $this->dbforge->add_field(array(
                'version' => array('type' => 'BIGINT', 'constraint' => 20),
            ));

            $this->dbforge->create_table($this->_custom_migration_table, TRUE);
            $this->db->insert($this->_custom_migration_table, array('version' => 0));
        }
    }

    /**
     * Get the current migration version.
     *
     * @param bool $custom Whether to get custom migration version
     * @return int
     */
    public function current_version(bool $custom = false): int
    {
        return $custom ? $this->_get_custom_version() : $this->_get_version();
    }

    /**
     * Find all migrations in both default and custom paths.
     *
     * @param bool $custom Whether to find custom migrations
     * @return array
     */
    public function find_migrations(bool $custom = false)
    {
        $migrations = [];
        $path = $this->_migration_path;
        $search_path = $custom ? $path . 'custom/' : $path;

        // Load all *_*.php files in the migrations path
        foreach (glob($search_path . '*_*.php') as $file) {
            $name = basename($file, '.php');

            // Filter out non-migration files
            if (preg_match($this->_migration_regex, $name)) {
                $number = $this->_get_migration_number($name);

                // There cannot be duplicate migration numbers
                if (isset($migrations[$number])) {
                    $this->_error_string = sprintf($this->lang->line('migration_multiple_version'), $number);
                    show_error($this->_error_string);
                }

                $migrations[$number] = $file;
            }
        }

        ksort($migrations);
        return $migrations;
    }

    /**
     * Migrate to a schema version.
     *
     * @param string $target_version Target schema version
     * @param bool $custom Whether to run custom migrations
     * @return mixed TRUE if no migrations are found, current version string on success, FALSE on failure
     */
    public function version($target_version, bool $custom = false)
    {
        // Note: We use strings, so that timestamp versions work on 32-bit systems
        $current_version = $custom ? $this->_get_custom_version() : $this->_get_version();

        if ($this->_migration_type === 'sequential') {
            $target_version = sprintf('%03d', $target_version);
        } else {
            $target_version = (string) $target_version;
        }

        $migrations = $this->find_migrations($custom);

        if ($target_version > 0 && !isset($migrations[$target_version])) {
            $this->_error_string = sprintf($this->lang->line('migration_not_found'), $target_version);
            return FALSE;
        }

        if ($target_version > $current_version) {
            $method = 'up';
        } elseif ($target_version < $current_version) {
            $method = 'down';
            // We need this so that migrations are applied in reverse order
            krsort($migrations);
        } else {
            // Well, there's nothing to migrate then ...
            return TRUE;
        }

        // Validate all available migrations within our target range.
        $pending = [];
        foreach ($migrations as $number => $file) {
            // Ignore versions out of our range.
            if ($method === 'up') {
                if ($number <= $current_version) {
                    continue;
                } elseif ($number > $target_version) {
                    break;
                }
            } else {
                if ($number > $current_version) {
                    continue;
                } elseif ($number <= $target_version) {
                    break;
                }
            }

            // Check for sequence gaps
            if ($this->_migration_type === 'sequential') {
                if (isset($previous) && abs($number - $previous) > 1) {
                    $this->_error_string = sprintf($this->lang->line('migration_sequence_gap'), $number);
                    return FALSE;
                }

                $previous = $number;
            }

            include_once($file);
            $class = 'Migration_' . ucfirst(strtolower($this->_get_migration_name(basename($file, '.php'))));

            // Validate the migration file structure
            if (!class_exists($class, FALSE)) {
                $this->_error_string = sprintf($this->lang->line('migration_class_doesnt_exist'), $class);
                return FALSE;
            } elseif (!method_exists($class, $method) OR !(new ReflectionMethod($class, $method))->isPublic()) {
                $this->_error_string = sprintf($this->lang->line('migration_missing_' . $method . '_method'), $class);
                return FALSE;
            }

            $pending[$number] = array($class, $method);
        }

        // Now just run the necessary migrations
        foreach ($pending as $number => $migration) {
            log_message('debug', 'Migrating ' . $method . ' from version ' . $current_version . ' to version ' . $number);

            $migration[0] = new $migration[0];
            call_user_func($migration);
            $current_version = $number;
            $this->_update_version($current_version, $custom);
        }

        // This is necessary when moving down, since the the last migration applied
        // will be the down() method for the next migration up from the target
        if ($current_version <> $target_version) {
            $current_version = $target_version;
            $this->_update_version($current_version, $custom);
        }

        log_message('debug', 'Finished migrating to ' . $current_version);

        // If this was a default migration and it was successful, run custom migrations
        if (!$custom && $current_version !== FALSE) {
            $custom_migrations = $this->find_migrations(true);
            if (!empty($custom_migrations)) {
                $last_custom = basename(end($custom_migrations));
                $this->version($this->_get_migration_number($last_custom), true);
            }
        }

        return $current_version;
    }

    /**
     * Sets the schema to the latest migration for both default and custom migrations
     *
     * @return mixed Current version string on success, FALSE on failure
     */
    public function latest()
    {
        // Run default migrations
        $result = $this->_latest(false);

        // Run custom migrations first
        $custom_result = $this->_latest(true);

        return $result;
    }

    /**
     * Sets the schema to the latest migration
     *
     * @param bool $custom Whether to run custom migrations
     * @return mixed Current version string on success, FALSE on failure
     */
    protected function _latest(bool $custom = false)
    {
        $migrations = $this->find_migrations($custom);

        if (empty($migrations)) {
            $this->_error_string = $this->lang->line('migration_none_found');
            return FALSE;
        }

        $last_migration = basename(end($migrations));

        // Calculate the last migration step from existing migration
        // filenames and proceed to the standard version migration
        return $this->version($this->_get_migration_number($last_migration), $custom);
    }

    /**
     * Retrieves current custom schema version
     *
     * @return string Current migration version
     */
    protected function _get_custom_version()
    {
        $row = $this->db->select('version')->get($this->_custom_migration_table)->row();
        return $row ? $row->version : '0';
    }

    /**
     * Stores the current schema version
     *
     * @param string $migration Migration reached
     * @param bool $custom Whether to update custom migration version
     * @return void
     */
    protected function _update_version($migration, bool $custom = false)
    {
        $table = $custom ? $this->_custom_migration_table : $this->_migration_table;
        $this->db->update($table, array(
            'version' => $migration
        ));
    }
}
