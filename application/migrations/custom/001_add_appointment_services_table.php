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

class Migration_Add_appointment_services_table extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        $this->dbforge->add_field([
            'id_appointments' => [
                'type' => 'INT',
                'constraint' => '11',
                'null' => false,
            ],
            'id_services' => [
                'type' => 'INT',
                'constraint' => '11',
                'null' => false,
            ],
        ]);

        $this->dbforge->add_key(['id_appointments', 'id_services'], true);
        $this->dbforge->create_table('appointment_services', true, ['engine' => 'InnoDB']);

        // Add foreign key constraints after table creation
        $this->db->query('
            ALTER TABLE `' . $this->db->dbprefix('appointment_services') . '`
            ADD CONSTRAINT `appointment_services_appointments` FOREIGN KEY (`id_appointments`) 
            REFERENCES `' . $this->db->dbprefix('appointments') . '` (`id`) 
            ON DELETE CASCADE ON UPDATE CASCADE
        ');

        $this->db->query('
            ALTER TABLE `' . $this->db->dbprefix('appointment_services') . '`
            ADD CONSTRAINT `appointment_services_services` FOREIGN KEY (`id_services`) 
            REFERENCES `' . $this->db->dbprefix('services') . '` (`id`) 
            ON DELETE CASCADE ON UPDATE CASCADE
        ');
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
        $this->dbforge->drop_table('appointment_services');
    }
} 