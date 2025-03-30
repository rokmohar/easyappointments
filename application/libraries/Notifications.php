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

/**
 * Notifications library.
 *
 * Handles the notifications related functionality.
 *
 * @package Libraries
 */
class Notifications
{
    /**
     * @var EA_Controller|CI_Controller
     */
    protected EA_Controller|CI_Controller $CI;

    /**
     * Notifications constructor.
     */
    public function __construct()
    {
        $this->CI = &get_instance();

        $this->CI->load->model('admins_model');
        $this->CI->load->model('appointments_model');
        $this->CI->load->model('providers_model');
        $this->CI->load->model('secretaries_model');
        $this->CI->load->model('services_model');
        $this->CI->load->model('settings_model');

        $this->CI->load->library('email_messages');
        $this->CI->load->library('ics_file');
        $this->CI->load->library('timezones');
    }

    /**
     * Send the required notifications, related to an appointment creation/modification.
     *
     * @param array $appointment Appointment data.
     * @param array $service Service data.
     * @param array $provider Provider data.
     * @param array $customer Customer data.
     * @param array $settings Required settings.
     * @param bool|false $manage_mode Manage mode.
     */
    public function notify_appointment_saved(
        array $appointment,
        array $service,
        array $provider,
        array $customer,
        array $settings,
        bool $manage_mode = false,
    ): void {
        try {
            $current_language = config('language');

            $customer_link = site_url('booking/reschedule/' . $appointment['hash']);

            $provider_link = site_url('calendar/reschedule/' . $appointment['hash']);

            $additional_services = $this->get_additional_services($appointment);

            $ics_stream = $this->CI->ics_file->get_stream(
                $appointment,
                $service,
                $provider,
                $customer,
                $additional_services,
            );

            // Notify customer.
            $send_customer =
                !empty($customer['email']) && filter_var(setting('customer_notifications'), FILTER_VALIDATE_BOOLEAN);

            if ($send_customer === true) {
                config(['language' => $customer['language']]);
                $this->CI->lang->load('translations');
                $subject = $manage_mode ? lang('appointment_details_changed') : lang('appointment_booked');
                $message = $manage_mode ? '' : lang('thank_you_for_appointment');

                try {
                    $this->CI->email_messages->send_appointment_saved(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $subject,
                        $message,
                        $customer_link,
                        $customer['email'],
                        $ics_stream,
                        $customer['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-saved to customer', $appointment['id'] ?? null);
                }
            }

            // Notify provider.
            $send_provider = filter_var(
                $this->CI->providers_model->get_setting($provider['id'], 'notifications'),
                FILTER_VALIDATE_BOOLEAN,
            );

            if ($send_provider === true) {
                config(['language' => $provider['language']]);
                $this->CI->lang->load('translations');
                $subject = $manage_mode ? lang('appointment_details_changed') : lang('appointment_added_to_your_plan');
                $message = $manage_mode ? '' : lang('appointment_link_description');

                try {
                    $this->CI->email_messages->send_appointment_saved(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $subject,
                        $message,
                        $provider_link,
                        $provider['email'],
                        $ics_stream,
                        $provider['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-saved to provider', $appointment['id'] ?? null);
                }
            }

            // Notify admins.
            $admins = $this->CI->admins_model->get();

            foreach ($admins as $admin) {
                if ($admin['settings']['notifications'] === '0') {
                    continue;
                }

                config(['language' => $admin['language']]);
                $this->CI->lang->load('translations');
                $subject = $manage_mode ? lang('appointment_details_changed') : lang('appointment_added_to_your_plan');
                $message = $manage_mode ? '' : lang('appointment_link_description');

                try {
                    $this->CI->email_messages->send_appointment_saved(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $subject,
                        $message,
                        $provider_link,
                        $admin['email'],
                        $ics_stream,
                        $admin['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-saved to admin', $appointment['id'] ?? null);
                }
            }

            // Notify secretaries.
            $secretaries = $this->CI->secretaries_model->get();

            foreach ($secretaries as $secretary) {
                if ($secretary['settings']['notifications'] === '0') {
                    continue;
                }

                if (!in_array($provider['id'], $secretary['providers'])) {
                    continue;
                }

                config(['language' => $secretary['language']]);
                $this->CI->lang->load('translations');
                $subject = $manage_mode ? lang('appointment_details_changed') : lang('appointment_added_to_your_plan');
                $message = $manage_mode ? '' : lang('appointment_link_description');

                try {
                    $this->CI->email_messages->send_appointment_saved(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $subject,
                        $message,
                        $provider_link,
                        $secretary['email'],
                        $ics_stream,
                        $secretary['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-saved to secretary', $appointment['id'] ?? null);
                }
            }
        } catch (Throwable $e) {
            $this->log_exception($e, 'appointment-saved (general exception)', $appointment['id'] ?? null);
        } finally {
            config(['language' => $current_language ?? 'english']);
            $this->CI->lang->load('translations');
        }
    }

    /**
     * Send the required notifications, related to an appointment removal.
     *
     * @param array $appointment Appointment data.
     * @param array $service Service data.
     * @param array $provider Provider data.
     * @param array $customer Customer data.
     * @param array $settings Required settings.
     */
    public function notify_appointment_deleted(
        array $appointment,
        array $service,
        array $provider,
        array $customer,
        array $settings,
        string $cancellation_reason = '',
    ): void {
        try {
            $current_language = config('language');

            $additional_services = $this->get_additional_services($appointment);

            // Notify provider.
            $send_provider = filter_var(
                $this->CI->providers_model->get_setting($provider['id'], 'notifications'),
                FILTER_VALIDATE_BOOLEAN,
            );

            if ($send_provider === true) {
                config(['language' => $provider['language']]);
                $this->CI->lang->load('translations');

                try {
                    $this->CI->email_messages->send_appointment_deleted(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $provider['email'],
                        $cancellation_reason,
                        $provider['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-deleted to provider', $appointment['id'] ?? null);
                }
            }

            // Notify customer.
            $send_customer =
                !empty($customer['email']) && filter_var(setting('customer_notifications'), FILTER_VALIDATE_BOOLEAN);

            if ($send_customer === true) {
                config(['language' => $customer['language']]);
                $this->CI->lang->load('translations');

                try {
                    $this->CI->email_messages->send_appointment_deleted(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $customer['email'],
                        $cancellation_reason,
                        $customer['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-deleted to customer', $appointment['id'] ?? null);
                }
            }

            // Notify admins.
            $admins = $this->CI->admins_model->get();

            foreach ($admins as $admin) {
                if ($admin['settings']['notifications'] === '0') {
                    continue;
                }

                config(['language' => $admin['language']]);
                $this->CI->lang->load('translations');

                try {
                    $this->CI->email_messages->send_appointment_deleted(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $admin['email'],
                        $cancellation_reason,
                        $admin['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-deleted to admin', $appointment['id'] ?? null);
                }
            }

            // Notify secretaries.
            $secretaries = $this->CI->secretaries_model->get();

            foreach ($secretaries as $secretary) {
                if ($secretary['settings']['notifications'] === '0') {
                    continue;
                }

                if (!in_array($provider['id'], $secretary['providers'])) {
                    continue;
                }

                config(['language' => $secretary['language']]);
                $this->CI->lang->load('translations');

                try {
                    $this->CI->email_messages->send_appointment_deleted(
                        $appointment,
                        $provider,
                        $service,
                        $customer,
                        $settings,
                        $secretary['email'],
                        $cancellation_reason,
                        $secretary['timezone'],
                        $additional_services,
                    );
                } catch (Throwable $e) {
                    $this->log_exception($e, 'appointment-deleted to secretary', $appointment['id'] ?? null);
                }
            }
        } catch (Throwable $e) {
            log_message(
                'error',
                'Notifications - Could not email cancellation details of appointment (' .
                    ($appointment['id'] ?? '-') .
                    ') : ' .
                    $e->getMessage(),
            );
            log_message('error', $e->getTraceAsString());
        } finally {
            config(['language' => $current_language ?? 'english']);
            $this->CI->lang->load('translations');
        }
    }

    /**
     * Resolve the additional services attached to an appointment (excluding the primary service).
     *
     * The appointment carries a `service_ids` array (populated by Appointments_model::find) that
     * includes the primary service; fall back to the join table if it is not present.
     *
     * @param array $appointment Appointment data.
     *
     * @return array Array of service records, excluding the primary service.
     */
    private function get_additional_services(array $appointment): array
    {
        $service_ids =
            $appointment['service_ids'] ??
            (!empty($appointment['id'])
                ? $this->CI->appointments_model->get_appointment_services($appointment['id'])
                : []);

        $primary_id = (int) ($appointment['id_services'] ?? 0);

        $additional = [];

        foreach ($service_ids as $service_id) {
            if ((int) $service_id === $primary_id) {
                continue; // Skip the primary service, it is already rendered.
            }

            $service = $this->CI->services_model->find($service_id);

            if ($service) {
                $additional[] = $service;
            }
        }

        return $additional;
    }

    private function log_exception(Throwable $e, string $message, ?int $appointment_id): void
    {
        log_message(
            'error',
            'Notifications - Could not email ' . $message . ' (' . ($appointment_id ?? '-') . ') : ' . $e->getMessage(),
        );
        log_message('error', $e->getTraceAsString());
    }
}
