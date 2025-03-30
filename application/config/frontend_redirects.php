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

/*
|--------------------------------------------------------------------------
| External Frontend Redirects
|--------------------------------------------------------------------------
|
| When an external frontend replaces the built-in public booking pages, the
| application/hooks/frontend_redirect.php hook redirects each mapped page to
| the matching page on that frontend.
|
*/

// External frontend base URL (FRONTEND_URL env). Empty string disables all redirects below.
$config['frontend_url'] = defined('Config::FRONTEND_URL') ? rtrim((string) Config::FRONTEND_URL, '/') : '';

// Map of "<controller>/<method>" => frontend path template. The `{hash}` placeholder is replaced
// with the appointment hash taken from the request URL. Pages that are NOT listed here are never
// redirected (e.g. login, calendar, api), so the feature is fully opt-in. To redirect another page,
// add a line here - no code change required. The default paths target the salon-fabulous frontend;
// edit them freely for other deployments.
$config['frontend_redirects'] = [
    'booking/index' => '/narocanje', // create
    'booking/reschedule' => '/narocanje/{hash}', // edit / reschedule
    'booking_confirmation/of' => '/narocanje/{hash}', // confirmation -> manage page
    'booking_cancellation/of' => '/narocanje/{hash}', // cancellation -> manage page
];

/* End of file frontend_redirects.php */
/* Location: ./application/config/frontend_redirects.php */
