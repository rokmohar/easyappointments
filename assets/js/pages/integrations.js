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
 * Integrations page.
 *
 * This module implements the functionality of the integrations page.
 */
App.Pages.Integrations = (function () {
    const $runMigrations = $('#run-migrations');

    /**
     * Run database migrations.
     */
    function runMigrations() {
        $.ajax({
            url: App.Utils.Url.siteUrl('migrations/run'),
            type: 'POST',
            dataType: 'json',
            data: {
                csrf_token: vars('csrf_token')
            },
            beforeSend: function () {
                $runMigrations.prop('disabled', true);
            },
            success: function (response) {
                App.Layouts.Backend.displayNotification(lang('migrations_completed'));
            },
            error: function (jqXHR, textStatus, errorThrown) {
                App.Layouts.Backend.displayNotification(lang('migrations_failed'));
            },
            complete: function () {
                $runMigrations.prop('disabled', false);
            }
        });
    }

    /**
     * Initialize the module.
     */
    function initialize() {
        $runMigrations.on('click', runMigrations);
    }

    document.addEventListener('DOMContentLoaded', initialize);

    return {};
})(); 