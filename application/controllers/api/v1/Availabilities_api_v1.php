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

/**
 * Availabilities API v1 controller.
 *
 * @package Controllers
 */
class Availabilities_api_v1 extends EA_Controller
{
    /**
     * Availabilities_api_v1 constructor.
     */
    public function __construct()
    {
        parent::__construct();

        $this->load->library('api');

        $this->api->auth();

        $this->load->model('appointments_model');
        $this->load->model('providers_model');
        $this->load->model('services_model');
        $this->load->model('settings_model');

        $this->load->library('availability');
    }

    /**
     * Generate the available hours based on the selected date, service and provider.
     *
     * This resource requires the following query parameters:
     *
     *   - serviceId
     *   - providerId
     *   - date (start date)
     *   - endDate (optional, if not provided only the start date will be checked)
     *
     * Based on those values it will generate the available hours, just like how the booking page works.
     *
     * You can then safely create a new appointment starting on one of the selected hours.
     *
     * Notice: The returned hours are in the provider's timezone.
     *
     * If no date parameter is provided then the current date will be used.
     */
    public function get(): void
    {
        try {
            $provider_id = request('providerId');
            $service_id = request('serviceId');
            $date = request('date');

            if (!$date) {
                $date = date('Y-m-d');
            }

            $provider = $this->providers_model->find($provider_id);

            if (is_array($service_id)) {
                $totalDuration = 0;
                $service = null;

                for ($i = 0; $i < count($service_id); $i++) {
                    $currentService = $this->services_model->find($service_id[$i]);

                    if ($service === null || $service['duration'] < $currentService['duration']) {
                        $service = $currentService;
                    }

                    $totalDuration += $currentService['duration'];
                }

                $service['originalDuration'] = $service['duration'];
                $service['duration'] = $totalDuration;
            } else {
                $service = $this->services_model->find($service_id);
            }

            $until = request('until');

            if (!$until) {
                $available_hours = $this->availability->get_available_hours($date, $service, $provider);
                json_response($available_hours);
                return;
            }

            $result = [];

            // Handle date range
            $current_date = new DateTime($date);
            $until_date = new DateTime($until);

            while ($current_date <= $until_date) {
                $current_date_str = $current_date->format('Y-m-d');
                $available_hours = $this->availability->get_available_hours($current_date_str, $service, $provider);
                $result[$current_date_str] = $available_hours;
                $current_date->modify('+1 day');
            }

            json_response($result);
        } catch (Throwable $e) {
            json_exception($e);
        }
    }
}
