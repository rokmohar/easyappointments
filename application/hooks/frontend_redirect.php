<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * ---------------------------------------------------------------------------- */

/**
 * Redirect public booking pages to an external frontend.
 *
 * When the `frontend_url` config value is set (via the FRONTEND_URL env var), the built-in public
 * pages listed in the `frontend_redirects` map (see application/config/frontend_redirects.php) are
 * redirected to the matching page on the external frontend. The map is keyed by
 * "<controller>/<method>" and the value is a path template that may contain a `{hash}` placeholder,
 * resolved from the appointment hash in the request URL.
 *
 * Controllers/methods that are not present in the map (e.g. login, calendar, api) are never
 * redirected, so the feature is fully opt-in and backwards compatible.
 */
function frontend_redirect(): void
{
    if (is_cli() || ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        return; // CLI (migrations) and non-GET requests (POST/JSON endpoints) are never redirected.
    }

    $frontend_url = config('frontend_url');

    if (empty($frontend_url)) {
        return; // Feature disabled.
    }

    $CI = &get_instance();

    $key = strtolower($CI->router->class . '/' . $CI->router->method);

    $map = config('frontend_redirects', []);

    if (!isset($map[$key])) {
        return; // Not a redirected page (login, calendar, api, ...).
    }

    if (session('user_id')) {
        redirect('calendar'); // Logged-in users go to the backend calendar.
        return;
    }

    $hash = $CI->uri->segment(3, (string) ($CI->input->get('appointment_hash') ?? ''));

    $path = str_replace('{hash}', rawurlencode((string) $hash), $map[$key]);

    redirect(rtrim($frontend_url, '/') . $path); // Sends a 302 redirect and calls exit().
}
