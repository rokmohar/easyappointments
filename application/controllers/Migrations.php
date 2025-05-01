<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.5.0
 * ---------------------------------------------------------------------------- */

require_once __DIR__ . '/../core/EA_Migration.php';

/**
 * Migrations controller.
 *
 * Handles database migrations related operations.
 *
 * @package Controllers
 */
class Migrations extends EA_Controller
{
    /**
     * Migrations constructor.
     */
    public function __construct()
    {
        parent::__construct();
        
        $this->load->library('migration');
    }

    /**
     * Run database migrations.
     */
    public function run(): void
    {
        try {
            if (cannot('edit', PRIV_SYSTEM_SETTINGS)) {
                throw new RuntimeException('You do not have the required permissions for this task.');
            }

            if ($this->migration->latest() === false) {
                throw new RuntimeException($this->migration->error_string());
            }

            json_response([
                'success' => true
            ]);
        } catch (Throwable $e) {
            json_exception($e);
        }
    }
} 