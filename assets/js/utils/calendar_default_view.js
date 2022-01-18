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
 * Default calendar view utility.
 *
 * This module implements the functionality of the default calendar view.
 *
 * Old Name: BackendCalendarDefaultView
 */
App.Utils.CalendarDefaultView = (function () {
    const $calendarPage = $('#calendar-page');
    const $reloadAppointments = $('#reload-appointments');
    const $calendar = $('#calendar');
    const $selectFilterItem = $('#select-filter-item');
    const $appointmentsModal = $('#appointments-modal');
    const $unavailabilitiesModal = $('#unavailabilities-modal');
    const $header = $('#header');
    const $footer = $('#footer');
    const $notification = $('#notification');
    const $calendarToolbar = $('#calendar-toolbar');
    const FILTER_TYPE_PROVIDER = 'provider';
    const FILTER_TYPE_SERVICE = 'service';
    let lastFocusedEventData; // Contains event data for later use.

    /**
     * Add the utility event listeners.
     */
    function addEventListeners() {
        /**
         * Event: Reload Button "Click"
         *
         * When the user clicks the reload button, the calendar items need to be refreshed.
         */
        $reloadAppointments.on('click', () => {
            const calendarView = $calendar.fullCalendar('getView');

            refreshCalendarAppointments(
                $calendar,
                $selectFilterItem.val(),
                $selectFilterItem.find('option:selected').attr('type'),
                calendarView.start,
                calendarView.end
            );
        });

        /**
         * Event: Popover Close Button "Click"
         *
         * Hides the open popover element.
         */
        $calendarPage.on('click', '.close-popover', (event) => {
            $(event.target).parents('.popover').popover('dispose');
        });

        /**
         * Event: Popover Edit Button "Click"
         *
         * Enables the edit dialog of the selected calendar event.
         *
         * @param {jQuery.Event} event
         */
        $calendarPage.on('click', '.edit-popover', (event) => {
            const $target = $(event.target);

            $target.closest('.popover').popover('dispose');

            let startMoment;
            let endMoment;

            if (lastFocusedEventData.data.workingPlanException) {
                const date = lastFocusedEventData.data.date;
                const workingPlanException = lastFocusedEventData.data.workingPlanException;
                const provider = lastFocusedEventData.data.provider;

                App.Components.WorkingPlanExceptionsModal.edit(date, workingPlanException).done(
                    (date, workingPlanException) => {
                        const successCallback = () => {
                            App.Layouts.Backend.displayNotification(lang('working_plan_exception_saved'));

                            const workingPlanExceptions = JSON.parse(provider.settings.working_plan_exceptions) || {};

                            workingPlanExceptions[date] = workingPlanException;

                            for (const index in vars('available_providers')) {
                                const availableProvider = vars('available_providers')[index];

                                if (Number(availableProvider.id) === Number(provider.id)) {
                                    availableProvider.settings.working_plan_exceptions =
                                        JSON.stringify(workingPlanExceptions);
                                    break;
                                }
                            }

                            $selectFilterItem.trigger('change'); // Update the calendar.
                        };

                        App.Http.Calendar.saveWorkingPlanException(
                            date,
                            workingPlanException,
                            provider.id,
                            successCallback,
                            null
                        );
                    }
                );
            } else if (!lastFocusedEventData.data.is_unavailability) {
                const appointment = lastFocusedEventData.data;

                App.Components.AppointmentsModal.resetModal();

                // Apply appointment data and show modal dialog.
                $appointmentsModal.find('.modal-header h3').text(lang('edit_appointment_title'));
                $appointmentsModal.find('#appointment-id').val(appointment.id);
                $appointmentsModal.find('#select-service').val(appointment.id_services).trigger('change');
                $appointmentsModal.find('#select-provider').val(appointment.id_users_provider);

                // Set the start and end datetime of the appointment.
                startMoment = moment(appointment.start_datetime);
                $appointmentsModal.find('#start-datetime').datetimepicker('setDate', startMoment.toDate());

                endMoment = moment(appointment.end_datetime);
                $appointmentsModal.find('#end-datetime').datetimepicker('setDate', endMoment.toDate());

                const customer = appointment.customer;
                $appointmentsModal.find('#customer-id').val(appointment.id_users_customer);
                $appointmentsModal.find('#first-name').val(customer.first_name);
                $appointmentsModal.find('#last-name').val(customer.last_name);
                $appointmentsModal.find('#email').val(customer.email);
                $appointmentsModal.find('#phone-number').val(customer.phone_number);
                $appointmentsModal.find('#address').val(customer.address);
                $appointmentsModal.find('#city').val(customer.city);
                $appointmentsModal.find('#zip-code').val(customer.zip_code);
                $appointmentsModal.find('#appointment-location').val(appointment.location);
                $appointmentsModal.find('#appointment-notes').val(appointment.notes);
                $appointmentsModal.find('#customer-notes').val(customer.notes);
                $appointmentsModal.modal('show');
            } else {
                const unavailability = lastFocusedEventData.data;

                // Replace string date values with actual date objects.
                unavailability.start_datetime = lastFocusedEventData.start.format('YYYY-MM-DD HH:mm:ss');
                startMoment = moment(unavailability.start_datetime);
                unavailability.end_datetime = lastFocusedEventData.end.format('YYYY-MM-DD HH:mm:ss');
                endMoment = moment(unavailability.end_datetime);

                App.Components.UnavailabilitiesModal.resetModal();

                // Apply unavailability data to dialog.
                $unavailabilitiesModal.find('.modal-header h3').text('Edit Unavailability Period');
                $unavailabilitiesModal.find('#unavailability-start').datetimepicker('setDate', startMoment.toDate());
                $unavailabilitiesModal.find('#unavailability-id').val(unavailability.id);
                $unavailabilitiesModal.find('#unavailability-provider').val(unavailability.id_users_provider);
                $unavailabilitiesModal.find('#unavailability-end').datetimepicker('setDate', endMoment.toDate());
                $unavailabilitiesModal.find('#unavailability-notes').val(unavailability.notes);
                $unavailabilitiesModal.modal('show');
            }
        });

        /**
         * Event: Popover Delete Button "Click"
         *
         * Displays a prompt on whether the user wants the appointment to be deleted. If he confirms the
         * deletion then an AJAX call is made to the server and deletes the appointment from the database.
         *
         * @param {jQuery.Event} event
         */
        $calendarPage.on('click', '.delete-popover', (event) => {
            const $target = $(event.target);

            $target.parents('.popover').popover('dispose');

            if (lastFocusedEventData.data.workingPlanException) {
                const providerId = $selectFilterItem.val();

                const provider = vars('available_providers').find(
                    (availableProvider) => Number(availableProvider.id) === Number(providerId)
                );

                if (!provider) {
                    throw new Error('Provider could not be found: ' + providerId);
                }

                const successCallback = () => {
                    App.Layouts.Backend.displayNotification(lang('working_plan_exception_deleted'));

                    const workingPlanExceptions = JSON.parse(provider.settings.working_plan_exceptions) || {};
                    delete workingPlanExceptions[date];

                    for (const index in vars('available_providers')) {
                        const availableProvider = vars('available_providers')[index];

                        if (Number(availableProvider.id) === Number(providerId)) {
                            availableProvider.settings.working_plan_exceptions = JSON.stringify(workingPlanExceptions);
                            break;
                        }
                    }

                    $selectFilterItem.trigger('change'); // Update the calendar.
                };

                const date = lastFocusedEventData.start.format('YYYY-MM-DD');

                App.Http.Calendar.deleteWorkingPlanException(date, providerId, successCallback);
            } else if (!lastFocusedEventData.data.is_unavailability) {
                const buttons = [
                    {
                        text: lang('cancel'),
                        click: () => {
                            $('#message-box').dialog('close');
                        }
                    },
                    {
                        text: 'OK',
                        click: () => {
                            const appointmentId = lastFocusedEventData.data.id;

                            const deleteReason = $('#delete-reason').val();

                            App.Http.Calendar.deleteAppointment(appointmentId, deleteReason).done(() => {
                                $('#message-box').dialog('close');

                                // Refresh calendar event items.
                                $selectFilterItem.trigger('change');
                            });
                        }
                    }
                ];

                App.Utils.Message.show(
                    lang('delete_appointment_title'),
                    lang('write_appointment_removal_reason'),
                    buttons
                );

                $('<textarea/>', {
                    'class': 'form-control w-100',
                    'id': 'delete-reason',
                    'rows': '3'
                }).appendTo('#message-box');
            } else {
                // Do not display confirmation prompt.

                const unavailabilityId = lastFocusedEventData.data.id;

                App.Http.Calendar.deleteUnavailability(unavailabilityId).done(() => {
                    $('#message-box').dialog('close');

                    // Refresh calendar event items.
                    $selectFilterItem.trigger('change');
                });
            }
        });

        /**
         * Event: Calendar Filter Item "Change"
         *
         * Load the appointments that correspond to the select filter item and display them on the calendar.
         */
        $selectFilterItem.on('change', () => {
            // If current value is service, then the sync buttons must be disabled.
            if ($selectFilterItem.find('option:selected').attr('type') === FILTER_TYPE_SERVICE) {
                $('#google-sync, #enable-sync, #insert-appointment, #insert-dropdown').prop('disabled', true);
                $calendar.fullCalendar('option', {
                    selectable: false,
                    editable: false
                });
            } else {
                $('#google-sync, #enable-sync, #insert-appointment, #insert-dropdown').prop('disabled', false);
                $calendar.fullCalendar('option', {
                    selectable: true,
                    editable: true
                });

                const providerId = $selectFilterItem.val();

                const provider = vars('available_providers').find(
                    (availableProvider) => Number(availableProvider.id) === Number(providerId)
                );

                if (provider && provider.timezone) {
                    $('.provider-timezone').text(vars('timezones')[provider.timezone]);
                }

                // If the user has already the sync enabled then apply the proper style changes.
                if ($selectFilterItem.find('option:selected').attr('google-sync') === 'true') {
                    $('#enable-sync').removeClass('btn-light').addClass('btn-secondary enabled');
                    $('#enable-sync span').text(lang('disable_sync'));
                    $('#google-sync').prop('disabled', false);
                } else {
                    $('#enable-sync').removeClass('btn-secondary enabled').addClass('btn-light');
                    $('#enable-sync span').text(lang('enable_sync'));
                    $('#google-sync').prop('disabled', true);
                }
            }
        });
    }

    /**
     * Get Calendar Component Height
     *
     * This method calculates the proper calendar height, in order to be displayed correctly, even when the
     * browser window is resizing.
     *
     * @return {Number} Returns the calendar element height in pixels.
     */
    function getCalendarHeight() {
        const result =
            window.innerHeight - $footer.outerHeight() - $header.outerHeight() - $calendarToolbar.outerHeight() - 60; // 60 for fine tuning
        return result > 500 ? result : 500; // Minimum height is 500px
    }

    /**
     * Get the event notes for the popup widget.
     *
     * @param {Event} event
     */
    function getEventNotes(event) {
        if (!event.data || !event.data.notes) {
            return '-';
        }

        const notes = event.data.notes;

        return notes.length > 100 ? notes.substring(0, 100) + '...' : notes;
    }

    /**
     * Calendar Event "Click" Callback
     *
     * When the user clicks on an appointment object on the calendar, then a data preview popover is display
     * above the calendar item.
     */
    function calendarEventClick(event, jsEvent) {
        const $target = $(jsEvent.target);

        $calendarPage.find('.popover').popover('dispose'); // Close all open popovers.

        let $html;
        let displayEdit;
        let displayDelete;

        // Depending where the user clicked the event (title or empty space) we
        // need to use different selectors to reach the parent element.
        const $parent = $(jsEvent.target.offsetParent);
        const $altParent = $(jsEvent.target).parents().eq(1);

        if (
            $target.hasClass('fc-unavailability') ||
            $parent.hasClass('fc-unavailability') ||
            $altParent.hasClass('fc-unavailability')
        ) {
            displayEdit =
                ($parent.hasClass('fc-custom') || $altParent.hasClass('fc-custom')) &&
                vars('privileges').appointments.edit === true
                    ? 'me-2'
                    : 'd-none';
            displayDelete =
                ($parent.hasClass('fc-custom') || $altParent.hasClass('fc-custom')) &&
                vars('privileges').appointments.delete === true
                    ? 'me-2'
                    : 'd-none'; // Same value at the time.

            $html = $('<div/>', {
                'html': [
                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('start')
                    }),
                    $('<span/>', {
                        'text': App.Utils.Date.format(
                            event.start.format('YYYY-MM-DD HH:mm:ss'),
                            vars('date_format'),
                            vars('time_format'),
                            true
                        )
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('end')
                    }),
                    $('<span/>', {
                        'text': App.Utils.Date.format(
                            event.end.format('YYYY-MM-DD HH:mm:ss'),
                            vars('date_format'),
                            vars('time_format'),
                            true
                        )
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'text': lang('notes')
                    }),
                    $('<span/>', {
                        'text': getEventNotes(event)
                    }),
                    $('<br/>'),

                    $('<hr/>'),

                    $('<div/>', {
                        'class': 'd-flex justify-content-center',
                        'html': [
                            $('<button/>', {
                                'class': 'close-popover btn btn-outline-secondary me-2',
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-ban me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('close')
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'delete-popover btn btn-outline-secondary ' + displayDelete,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-trash-alt me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('delete')
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'edit-popover btn btn-primary ' + displayEdit,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-edit me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('edit')
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });
        } else if (
            $target.hasClass('fc-working-plan-exception') ||
            $parent.hasClass('fc-working-plan-exception') ||
            $altParent.hasClass('fc-working-plan-exception')
        ) {
            displayDelete =
                ($parent.hasClass('fc-custom') || $altParent.hasClass('fc-custom')) &&
                vars('privileges').appointments.delete === true
                    ? 'me-2'
                    : 'd-none';

            $html = $('<div/>', {
                'html': [
                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('provider')
                    }),
                    $('<span/>', {
                        'text': event.data ? event.data.provider.first_name + ' ' + event.data.provider.last_name : '-'
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('start')
                    }),
                    $('<span/>', {
                        'text': App.Utils.Date.format(
                            event.data.date + ' ' + event.data.workingPlanException.start,
                            vars('date_format'),
                            vars('time_format'),
                            true
                        )
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('end')
                    }),
                    $('<span/>', {
                        'text': App.Utils.Date.format(
                            event.data.date + ' ' + event.data.workingPlanException.end,
                            vars('date_format'),
                            vars('time_format'),
                            true
                        )
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('timezone')
                    }),
                    $('<span/>', {
                        'text': vars('timezones')[event.data.provider.timezone]
                    }),
                    $('<br/>'),

                    $('<hr/>'),

                    $('<div/>', {
                        'class': 'd-flex justify-content-between',
                        'html': [
                            $('<button/>', {
                                'class': 'close-popover btn btn-outline-secondary me-2',
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-ban me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('close')
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'delete-popover btn btn-outline-secondary ' + displayDelete,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-trash-alt me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('delete')
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'edit-popover btn btn-primary',
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-edit me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('edit')
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });
        } else {
            displayEdit = vars('privileges').appointments.edit === true ? 'me-2' : 'd-none';
            displayDelete = vars('privileges').appointments.delete === true ? 'me-2' : 'd-none';

            $html = $('<div/>', {
                'html': [
                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('start')
                    }),
                    $('<span/>', {
                        'text': App.Utils.Date.format(
                            event.start.format('YYYY-MM-DD HH:mm:ss'),
                            vars('date_format'),
                            vars('time_format'),
                            true
                        )
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('end')
                    }),
                    $('<span/>', {
                        'text': App.Utils.Date.format(
                            event.end.format('YYYY-MM-DD HH:mm:ss'),
                            vars('date_format'),
                            vars('time_format'),
                            true
                        )
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('timezone')
                    }),
                    $('<span/>', {
                        'text': vars('timezones')[event.data.provider.timezone]
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('service')
                    }),
                    $('<span/>', {
                        'text': event.data.service.name
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('provider')
                    }),
                    App.Utils.CalendarEventPopover.renderMapIcon(event.data.provider),
                    $('<span/>', {
                        'text': event.data.provider.first_name + ' ' + event.data.provider.last_name
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('customer')
                    }),
                    App.Utils.CalendarEventPopover.renderMapIcon(event.data.customer),
                    $('<span/>', {
                        'class': 'd-inline-block ms-1',
                        'text': event.data.customer.first_name + ' ' + event.data.customer.last_name
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('email')
                    }),
                    App.Utils.CalendarEventPopover.renderMailIcon(event.data.customer.email),
                    $('<span/>', {
                        'class': 'd-inline-block ms-1',
                        'text': event.data.customer.email
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'class': 'd-inline-block me-2',
                        'text': lang('phone')
                    }),
                    App.Utils.CalendarEventPopover.renderPhoneIcon(event.data.customer.phone_number),
                    $('<span/>', {
                        'class': 'd-inline-block ms-1',
                        'text': event.data.customer.phone_number
                    }),
                    $('<br/>'),

                    $('<strong/>', {
                        'text': lang('notes')
                    }),
                    $('<span/>', {
                        'text': getEventNotes(event)
                    }),
                    $('<br/>'),

                    $('<hr/>'),

                    $('<div/>', {
                        'class': 'd-flex justify-content-center',
                        'html': [
                            $('<button/>', {
                                'class': 'close-popover btn btn-outline-secondary me-2',
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-ban me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('close')
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'delete-popover btn btn-outline-secondary ' + displayDelete,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-trash-alt me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('delete')
                                    })
                                ]
                            }),
                            $('<button/>', {
                                'class': 'edit-popover btn btn-primary ' + displayEdit,
                                'html': [
                                    $('<i/>', {
                                        'class': 'fas fa-edit me-2'
                                    }),
                                    $('<span/>', {
                                        'text': lang('edit')
                                    })
                                ]
                            })
                        ]
                    })
                ]
            });
        }

        $target.popover({
            placement: 'top',
            title: event.title,
            content: $html,
            html: true,
            container: '#calendar',
            trigger: 'manual'
        });

        lastFocusedEventData = event;

        $target.popover('toggle');

        // Fix popover position.
        const $popover = $calendarPage.find('.popover');

        if ($popover.length > 0 && $popover.position().top < 200) {
            $popover.css('top', '200px');
        }
    }

    /**
     * Calendar Event "Resize" Callback
     *
     * The user can change the duration of an event by resizing an appointment object on the calendar. This
     * change needs to be stored to the database too and this is done via an ajax call.
     *
     * @see updateAppointmentData()
     */
    function calendarEventResize(event, delta, revertFunc) {
        if (vars('privileges').appointments.edit === false) {
            revertFunc();
            App.Layouts.Backend.displayNotification(lang('no_privileges_edit_appointments'));
            return;
        }

        let successCallback;

        if ($notification.is(':visible')) {
            $notification.hide('bind');
        }

        if (!event.data.is_unavailability) {
            // Prepare appointment data.
            event.data.end_datetime = moment(event.data.end_datetime)
                .add({days: delta.days(), hours: delta.hours(), minutes: delta.minutes()})
                .format('YYYY-MM-DD HH:mm:ss');

            const appointment = {...event.data};

            appointment.is_unavailability = Number(appointment.is_unavailability);

            // Must delete the following because only appointment data should be provided to the AJAX call.
            delete appointment.customer;
            delete appointment.provider;
            delete appointment.service;

            // Success callback
            successCallback = () => {
                // Display success notification to user.
                const undoFunction = () => {
                    appointment.end_datetime = event.data.end_datetime = moment(appointment.end_datetime)
                        .add({days: -delta.days(), hours: -delta.hours(), minutes: -delta.minutes()})
                        .format('YYYY-MM-DD HH:mm:ss');

                    App.Http.Calendar.saveAppointment(appointment).done(() => {
                        $notification.hide('blind');
                    });

                    revertFunc();
                };

                App.Layouts.Backend.displayNotification(lang('appointment_updated'), [
                    {
                        'label': lang('undo'),
                        'function': undoFunction
                    }
                ]);
                $footer.css('position', 'static'); // Footer position fix.

                // Update the event data for later use.
                $calendar.fullCalendar('updateEvent', event);
            };

            // Update appointment data.
            App.Http.Calendar.saveAppointment(appointment, null, successCallback);
        } else {
            // Update unavailability time period.
            const unavailability = {
                id: event.data.id,
                start_datetime: event.start.format('YYYY-MM-DD HH:mm:ss'),
                end_datetime: event.end.format('YYYY-MM-DD HH:mm:ss'),
                id_users_provider: event.data.id_users_provider
            };

            event.data.end_datetime = unavailability.end_datetime;

            // Define success callback function.
            successCallback = () => {
                // Display success notification to user.
                const undoFunction = () => {
                    unavailability.end_datetime = event.data.end_datetime = moment(unavailability.end_datetime)
                        .add({minutes: -delta.minutes()})
                        .format('YYYY-MM-DD HH:mm:ss');

                    unavailability.is_unavailability = Number(unavailability.is_unavailability);

                    App.Http.Calendar.saveAppointment(unavailability).done(() => {
                        $notification.hide('blind');
                    });

                    revertFunc();
                };

                App.Layouts.Backend.displayNotification(lang('unavailability_updated'), [
                    {
                        'label': lang('undo'),
                        'function': undoFunction
                    }
                ]);

                $footer.css('position', 'static'); // Footer position fix.

                // Update the event data for later use.
                $calendar.fullCalendar('updateEvent', event);
            };

            App.Http.Calendar.saveUnavailability(unavailability, successCallback, null);
        }
    }

    /**
     * Calendar Window "Resize" Callback
     *
     * The calendar element needs to be re-sized too in order to fit into the window. Nevertheless, if the window
     * becomes very small the the calendar won't shrink anymore.
     *
     * @see getCalendarHeight()
     */
    function calendarWindowResize() {
        $calendar.fullCalendar('option', 'height', getCalendarHeight());
    }

    /**
     * Calendar Day "Click" Callback
     *
     * When the user clicks on a day square on the calendar, then he will automatically be transferred to that
     * day view calendar.
     *
     * @param {Date} date
     */
    function calendarDayClick(date) {
        if (!date.hasTime()) {
            $calendar.fullCalendar('changeView', 'agendaDay');
            $calendar.fullCalendar('gotoDate', date);
        }
    }

    /**
     * Calendar Event "Drop" Callback
     *
     * This event handler is triggered whenever the user drags and drops an event into a different position
     * on the calendar. We need to update the database with this change. This is done via an ajax call.
     *
     * @param {object} event
     * @param {object} delta
     * @param {function} revertFunc
     */
    function calendarEventDrop(event, delta, revertFunc) {
        if (vars('privileges').appointments.edit === false) {
            revertFunc();
            App.Layouts.Backend.displayNotification(lang('no_privileges_edit_appointments'));
            return;
        }

        if ($notification.is(':visible')) {
            $notification.hide('bind');
        }

        let successCallback;

        if (!event.data.is_unavailability) {
            // Prepare appointment data.
            const appointment = {...event.data};

            // Must delete the following because only appointment data should be provided to the ajax call.
            delete appointment.customer;
            delete appointment.provider;
            delete appointment.service;

            appointment.start_datetime = moment(appointment.start_datetime)
                .add({days: delta.days(), hours: delta.hours(), minutes: delta.minutes()})
                .format('YYYY-MM-DD HH:mm:ss');

            appointment.end_datetime = moment(appointment.end_datetime)
                .add({days: delta.days(), hours: delta.hours(), minutes: delta.minutes()})
                .format('YYYY-MM-DD HH:mm:ss');

            appointment.is_unavailability = Number(appointment.is_unavailability);

            event.data.start_datetime = appointment.start_datetime;
            event.data.end_datetime = appointment.end_datetime;

            // Define success callback function.
            successCallback = () => {
                // Define the undo function, if the user needs to reset the last change.
                const undoFunction = () => {
                    appointment.start_datetime = moment(appointment.start_datetime)
                        .add({days: -delta.days(), hours: -delta.hours(), minutes: -delta.minutes()})
                        .format('YYYY-MM-DD HH:mm:ss');

                    appointment.end_datetime = moment(appointment.end_datetime)
                        .add({days: -delta.days(), hours: -delta.hours(), minutes: -delta.minutes()})
                        .format('YYYY-MM-DD HH:mm:ss');

                    event.data.start_datetime = appointment.start_datetime;
                    event.data.end_datetime = appointment.end_datetime;

                    App.Http.Calendar.saveAppointment(appointment).done(() => {
                        $notification.hide('blind');
                    });

                    revertFunc();
                };

                App.Layouts.Backend.displayNotification(lang('appointment_updated'), [
                    {
                        'label': lang('undo'),
                        'function': undoFunction
                    }
                ]);

                $footer.css('position', 'static'); // Footer position fix.
            };

            // Update appointment data.
            App.Http.Calendar.saveAppointment(appointment, null, successCallback);
        } else {
            // Update unavailability time period.
            const unavailability = {
                id: event.data.id,
                start_datetime: event.start.format('YYYY-MM-DD HH:mm:ss'),
                end_datetime: event.end.format('YYYY-MM-DD HH:mm:ss'),
                id_users_provider: event.data.id_users_provider
            };

            successCallback = () => {
                const undoFunction = () => {
                    unavailability.start_datetime = moment(unavailability.start_datetime)
                        .add({days: -delta.days(), minutes: -delta.minutes()})
                        .format('YYYY-MM-DD HH:mm:ss');

                    unavailability.end_datetime = moment(unavailability.end_datetime)
                        .add({days: -delta.days(), minutes: -delta.minutes()})
                        .format('YYYY-MM-DD HH:mm:ss');

                    unavailability.is_unavailability = Number(unavailability.is_unavailability);

                    event.data.start_datetime = unavailability.start_datetime;
                    event.data.end_datetime = unavailability.end_datetime;

                    App.Http.Calendar.saveUnavailability(unavailability).done(() => {
                        $notification.hide('blind');
                    });

                    revertFunc();
                };

                App.Layouts.Backend.displayNotification(lang('unavailability_updated'), [
                    {
                        label: lang('undo'),
                        function: undoFunction
                    }
                ]);

                $footer.css('position', 'static'); // Footer position fix.
            };

            App.Http.Calendar.saveUnavailability(unavailability, successCallback);
        }
    }

    /**
     * Calendar "View Render" Callback
     *
     * Whenever the calendar changes or refreshes its view certain actions need to be made, in order to
     * display proper information to the user.
     */
    function calendarViewRender() {
        if ($selectFilterItem.val() === null) {
            return;
        }

        refreshCalendarAppointments(
            $calendar,
            $selectFilterItem.val(),
            $('#select-filter-item option:selected').attr('type'),
            $calendar.fullCalendar('getView').start,
            $calendar.fullCalendar('getView').end
        );

        $(window).trigger('resize'); // Places the footer on the bottom.

        // Remove all open popovers.
        $('.close-popover').each((index, closePopoverButton) => {
            $(closePopoverButton).parents('.popover').popover('dispose');
        });

        // Add new popovers.
        $('.fv-events').each((index, eventElement) => {
            $(eventElement).popover();
        });
    }

    /**
     * Convert titles to HTML
     *
     * On some calendar events the titles contain html markup that is not displayed properly due to the
     * FullCalendar plugin. This plugin sets the .fc-event-title value by using the $.text() method and
     * not the $.html() method. So in order for the title to display the html properly we convert all the
     * .fc-event-titles where needed into html.
     */
    function convertTitlesToHtml() {
        // Convert the titles to html code.
        $('.fc-custom').each((index, customEventElement) => {
            const title = $(customEventElement).find('.fc-event-title').text();
            $(customEventElement).find('.fc-event-title').html(title);
            const time = $(customEventElement).find('.fc-event-time').text();
            $(customEventElement).find('.fc-event-time').html(time);
        });
    }

    /**
     * Refresh Calendar Appointments
     *
     * This method reloads the registered appointments for the selected date period and filter type.
     *
     * @param {Object} $calendar The calendar jQuery object.
     * @param {Number} recordId The selected record id.
     * @param {String} filterType The filter type, could be either FILTER_TYPE_PROVIDER or FILTER_TYPE_SERVICE.
     * @param {String} startDate Visible start date of the calendar.
     * @param {String} endDate Visible end date of the calendar.
     */
    function refreshCalendarAppointments($calendar, recordId, filterType, startDate, endDate) {
        $('#loading').css('visibility', 'hidden');

        const calendarEventSource = [];

        startDate = moment(startDate).format('YYYY-MM-DD');

        endDate = moment(endDate).format('YYYY-MM-DD');

        App.Http.Calendar.getCalendarAppointments(recordId, startDate, endDate, filterType)
            .done((response) => {
                $calendar.fullCalendar('removeEvents');

                // Add appointments to calendar.
                response.appointments.forEach((appointment) => {
                    const appointmentEvent = {
                        id: appointment.id,
                        title:
                            appointment.service.name +
                            ' - ' +
                            appointment.customer.first_name +
                            ' ' +
                            appointment.customer.last_name,
                        start: moment(appointment.start_datetime),
                        end: moment(appointment.end_datetime),
                        allDay: false,
                        data: appointment // Store appointment data for later use.
                    };

                    calendarEventSource.push(appointmentEvent);
                });

                // Add custom unavailability periods (they are always displayed on the calendar, even if the provider won't
                // work on that day).
                response.unavailabilities.forEach((unavailability) => {
                    let notes = unavailability.notes ? ' - ' + unavailability.notes : '';

                    if (unavailability.notes && unavailability.notes.length > 30) {
                        notes = unavailability.notes.substring(0, 30) + '...';
                    }

                    const unavailabilityEvent = {
                        title: lang('unavailability') + notes,
                        start: moment(unavailability.start_datetime),
                        end: moment(unavailability.end_datetime),
                        allDay: false,
                        color: '#879DB4',
                        editable: true,
                        className: 'fc-unavailability fc-custom',
                        data: unavailability
                    };

                    calendarEventSource.push(unavailabilityEvent);
                });

                const calendarView = $calendar.fullCalendar('getView');

                if (filterType === FILTER_TYPE_PROVIDER && calendarView.name !== 'month') {
                    const provider = vars('available_providers').find(
                        (availableProvider) => Number(availableProvider.id) === Number(recordId)
                    );

                    if (!provider) {
                        throw new Error('Provider was not found.');
                    }

                    const workingPlan = JSON.parse(provider.settings.working_plan);
                    const workingPlanExceptions = JSON.parse(provider.settings.working_plan_exceptions);
                    let unavailabilityEvent;
                    let viewStart;
                    let viewEnd;
                    let breakStart;
                    let breakEnd;
                    let workingPlanExceptionStart;
                    let workingPlanExceptionEnd;
                    let weekdayNumber;
                    let weekdayName;
                    let weekdayDate;
                    let workingPlanExceptionEvent;
                    let startHour;
                    let endHour;
                    let workDateStart;
                    let workDateEnd;

                    // Sort the working plan starting with the first day as set in General settings to correctly align
                    // breaks in the calendar display.
                    const firstWeekdayNumber = App.Utils.Date.getWeekdayId(vars('first_weekday'));
                    const sortedWorkingPlan = App.Utils.Date.sortWeekDictionary(workingPlan, firstWeekdayNumber);

                    switch (calendarView.name) {
                        case 'agendaDay':
                            weekdayNumber = parseInt(calendarView.start.format('d'));
                            weekdayName = App.Utils.Date.getWeekdayName(weekdayNumber);
                            weekdayDate = calendarView.start.clone().format('YYYY-MM-DD');

                            // Add working plan exception.
                            if (workingPlanExceptions && workingPlanExceptions[weekdayDate]) {
                                sortedWorkingPlan[weekdayName] = workingPlanExceptions[weekdayDate];
                                workingPlanExceptionStart = weekdayDate + ' ' + sortedWorkingPlan[weekdayName].start;
                                workingPlanExceptionEnd = weekdayDate + ' ' + sortedWorkingPlan[weekdayName].end;

                                workingPlanExceptionEvent = {
                                    title: lang('working_plan_exception'),
                                    start: moment(workingPlanExceptionStart, 'YYYY-MM-DD HH:mm', true),
                                    end: moment(workingPlanExceptionEnd, 'YYYY-MM-DD HH:mm', true).add(1, 'day'),
                                    allDay: true,
                                    color: '#879DB4',
                                    editable: false,
                                    className: 'fc-working-plan-exception fc-custom',
                                    data: {
                                        date: weekdayDate,
                                        workingPlanException: workingPlanExceptions[weekdayDate],
                                        provider: provider
                                    }
                                };

                                calendarEventSource.push(workingPlanExceptionEvent);
                            }

                            // Non-working day.
                            if (sortedWorkingPlan[weekdayName] === null) {
                                // Working plan exception.
                                unavailabilityEvent = {
                                    title: lang('not_working'),
                                    start: calendarView.intervalStart.clone(),
                                    end: calendarView.intervalEnd.clone(),
                                    allDay: false,
                                    color: '#BEBEBE',
                                    editable: false,
                                    className: 'fc-unavailability'
                                };

                                calendarEventSource.push(unavailabilityEvent);

                                return; // Go to next loop.
                            }

                            // Add unavailability period before work starts.
                            viewStart = moment(calendarView.start.format('YYYY-MM-DD') + ' 00:00:00');
                            startHour = sortedWorkingPlan[weekdayName].start.split(':');
                            workDateStart = viewStart.clone();
                            workDateStart.hour(parseInt(startHour[0]));
                            workDateStart.minute(parseInt(startHour[1]));

                            if (viewStart < workDateStart) {
                                const unavailabilityPeriodBeforeWorkStarts = {
                                    title: lang('not_working'),
                                    start: viewStart,
                                    end: workDateStart,
                                    allDay: false,
                                    color: '#BEBEBE',
                                    editable: false,
                                    className: 'fc-unavailability'
                                };

                                calendarEventSource.push(unavailabilityPeriodBeforeWorkStarts);
                            }

                            // Add unavailability period after work ends.
                            viewEnd = moment(calendarView.end.format('YYYY-MM-DD') + ' 00:00:00');
                            endHour = sortedWorkingPlan[weekdayName].end.split(':');
                            workDateEnd = viewStart.clone();
                            workDateEnd.hour(parseInt(endHour[0]));
                            workDateEnd.minute(parseInt(endHour[1]));

                            if (viewEnd > workDateEnd) {
                                const unavailabilityPeriodAfterWorkEnds = {
                                    title: lang('not_working'),
                                    start: workDateEnd,
                                    end: viewEnd,
                                    allDay: false,
                                    color: '#BEBEBE',
                                    editable: false,
                                    className: 'fc-unavailability'
                                };

                                calendarEventSource.push(unavailabilityPeriodAfterWorkEnds);
                            }

                            // Add unavailability periods for breaks.
                            sortedWorkingPlan[weekdayName].breaks.forEach((breakPeriod) => {
                                const breakStartString = breakPeriod.start.split(':');
                                breakStart = viewStart.clone();
                                breakStart.hour(parseInt(breakStartString[0]));
                                breakStart.minute(parseInt(breakStartString[1]));

                                const breakEndString = breakPeriod.end.split(':');
                                breakEnd = viewStart.clone();
                                breakEnd.hour(parseInt(breakEndString[0]));
                                breakEnd.minute(parseInt(breakEndString[1]));

                                const unavailabilityPeriod = {
                                    title: lang('break'),
                                    start: breakStart,
                                    end: breakEnd,
                                    allDay: false,
                                    color: '#BEBEBE',
                                    editable: false,
                                    className: 'fc-unavailability fc-break'
                                };

                                calendarEventSource.push(unavailabilityPeriod);
                            });

                            break;

                        case 'agendaWeek':
                            const calendarDate = calendarView.start.clone();

                            while (calendarDate < calendarView.end) {
                                weekdayNumber = parseInt(calendarDate.format('d'));
                                weekdayName = App.Utils.Date.getWeekdayName(weekdayNumber);
                                weekdayDate = calendarDate.format('YYYY-MM-DD');

                                // Add working plan exception event.
                                if (workingPlanExceptions && workingPlanExceptions[weekdayDate]) {
                                    sortedWorkingPlan[weekdayName] = workingPlanExceptions[weekdayDate];

                                    workingPlanExceptionStart =
                                        weekdayDate + ' ' + sortedWorkingPlan[weekdayName].start;
                                    workingPlanExceptionEnd = weekdayDate + ' ' + sortedWorkingPlan[weekdayName].end;

                                    workingPlanExceptionEvent = {
                                        title: lang('working_plan_exception'),
                                        start: moment(workingPlanExceptionStart, 'YYYY-MM-DD HH:mm', true),
                                        end: moment(workingPlanExceptionEnd, 'YYYY-MM-DD HH:mm', true).add(1, 'day'),
                                        allDay: true,
                                        color: '#879DB4',
                                        editable: false,
                                        className: 'fc-working-plan-exception fc-custom',
                                        data: {
                                            date: weekdayDate,
                                            workingPlanException: workingPlanExceptions[weekdayDate],
                                            provider: provider
                                        }
                                    };

                                    calendarEventSource.push(workingPlanExceptionEvent);
                                }

                                // Non-working day.
                                if (sortedWorkingPlan[weekdayName] === null) {
                                    // Add a full day unavailability event.
                                    unavailabilityEvent = {
                                        title: lang('not_working'),
                                        start: calendarDate.clone(),
                                        end: calendarDate.clone().add(1, 'day'),
                                        allDay: false,
                                        color: '#BEBEBE',
                                        editable: false,
                                        className: 'fc-unavailability'
                                    };

                                    calendarEventSource.push(unavailabilityEvent);

                                    calendarDate.add(1, 'day');

                                    continue; // Go to the next loop.
                                }

                                // Add unavailability period before work starts.
                                startHour = sortedWorkingPlan[weekdayName].start.split(':');
                                workDateStart = calendarDate.clone();
                                workDateStart.hour(parseInt(startHour[0]));
                                workDateStart.minute(parseInt(startHour[1]));

                                if (calendarDate < workDateStart) {
                                    unavailabilityEvent = {
                                        title: lang('not_working'),
                                        start: calendarDate.clone(),
                                        end: moment(
                                            calendarDate.format('YYYY-MM-DD') +
                                                ' ' +
                                                sortedWorkingPlan[weekdayName].start +
                                                ':00'
                                        ),
                                        allDay: false,
                                        color: '#BEBEBE',
                                        editable: false,
                                        className: 'fc-unavailability'
                                    };

                                    calendarEventSource.push(unavailabilityEvent);
                                }

                                // Add unavailability period after work ends.
                                endHour = sortedWorkingPlan[weekdayName].end.split(':');
                                workDateEnd = calendarDate.clone();
                                workDateEnd.hour(parseInt(endHour[0]));
                                workDateEnd.minute(parseInt(endHour[1]));

                                if (calendarView.end > workDateEnd) {
                                    unavailabilityEvent = {
                                        title: lang('not_working'),
                                        start: moment(
                                            calendarDate.format('YYYY-MM-DD') +
                                                ' ' +
                                                sortedWorkingPlan[weekdayName].end +
                                                ':00'
                                        ),
                                        end: calendarDate.clone().add(1, 'day'),
                                        allDay: false,
                                        color: '#BEBEBE',
                                        editable: false,
                                        className: 'fc-unavailability'
                                    };

                                    calendarEventSource.push(unavailabilityEvent);
                                }

                                // Add unavailability periods during day breaks.
                                sortedWorkingPlan[weekdayName].breaks.forEach((breakPeriod) => {
                                    const breakStartString = breakPeriod.start.split(':');
                                    breakStart = calendarDate.clone();
                                    breakStart.hour(parseInt(breakStartString[0]));
                                    breakStart.minute(parseInt(breakStartString[1]));

                                    const breakEndString = breakPeriod.end.split(':');
                                    breakEnd = calendarDate.clone();
                                    breakEnd.hour(parseInt(breakEndString[0]));
                                    breakEnd.minute(parseInt(breakEndString[1]));

                                    const unavailabilityEvent = {
                                        title: lang('break'),
                                        start: moment(calendarDate.format('YYYY-MM-DD') + ' ' + breakPeriod.start),
                                        end: moment(calendarDate.format('YYYY-MM-DD') + ' ' + breakPeriod.end),
                                        allDay: false,
                                        color: '#BEBEBE',
                                        editable: false,
                                        className: 'fc-unavailability fc-break'
                                    };

                                    calendarEventSource.push(unavailabilityEvent);
                                });

                                calendarDate.add(1, 'day');
                            }

                            break;
                    }
                }
            })
            .always(() => {
                $('#loading').css('visibility', '');
                $calendar.fullCalendar('addEventSource', calendarEventSource);
            });
    }

    function initialize() {
        // Dynamic date formats.
        let columnFormat = {};

        switch (vars('date_format')) {
            case 'DMY':
                columnFormat = 'ddd D/M';
                break;

            case 'MDY':
            case 'YMD':
                columnFormat = 'ddd M/D';
                break;

            default:
                throw new Error('Invalid date format setting provided!', vars('date_format'));
        }

        // Time formats
        let timeFormat = '';
        let slotTimeFormat = '';

        switch (vars('time_format')) {
            case 'military':
                timeFormat = 'H:mm';
                slotTimeFormat = 'H(:mm)';
                break;
            case 'regular':
                timeFormat = 'h:mm a';
                slotTimeFormat = 'h(:mm) a';
                break;
            default:
                throw new Error('Invalid time format setting provided!', vars('time_format'));
        }

        const defaultView = window.innerWidth < 468 ? 'agendaDay' : 'agendaWeek';

        const firstWeekday = vars('first_weekday');
        const firstWeekdayNumber = App.Utils.Date.getWeekdayId(firstWeekday);

        // Initialize page calendar
        $calendar.fullCalendar({
            defaultView: defaultView,
            height: getCalendarHeight(),
            editable: true,
            firstDay: firstWeekdayNumber,
            slotDuration: '00:15:00',
            snapDuration: '00:15:00',
            slotLabelInterval: '01:00',
            timeFormat: timeFormat,
            slotLabelFormat: slotTimeFormat,
            allDayText: lang('all_day'),
            columnFormat: columnFormat,
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'agendaDay,agendaWeek,month'
            },

            // Selectable
            selectable: true,
            selectHelper: true,
            select: (start, end) => {
                if (!start.hasTime() || !end.hasTime()) {
                    return;
                }

                $('#insert-appointment').trigger('click');

                // Preselect service & provider.
                let service;

                if ($selectFilterItem.find('option:selected').attr('type') === FILTER_TYPE_SERVICE) {
                    service = vars('available_services').find(
                        (availableService) => Number(availableService.id) === Number($selectFilterItem.val())
                    );
                    $appointmentsModal.find('#select-service').val(service.id).trigger('change');
                } else {
                    const provider = vars('available_providers').find(
                        (availableProvider) => Number(availableProvider.id) === Number($selectFilterItem.val())
                    );

                    service = vars('available_services').find(
                        (availableService) => provider.services.indexOf(availableService.id) !== -1
                    );

                    if (service) {
                        $appointmentsModal.find('#select-service').val(service.id);
                    }

                    if (!$appointmentsModal.find('#select-service').val()) {
                        $('#select-service option:first').prop('selected', true);
                    }

                    $appointmentsModal.find('#select-service').trigger('change');

                    if (provider) {
                        $appointmentsModal.find('#select-provider').val(provider.id);
                    }

                    if (!$appointmentsModal.find('#select-provider').val()) {
                        $appointmentsModal.find('#select-provider option:first').prop('selected', true);
                    }

                    $appointmentsModal.find('#select-provider').trigger('change');
                }

                // Preselect time
                $('#start-datetime').datepicker('setDate', new Date(start.format('YYYY/MM/DD HH:mm:ss')));
                $('#end-datetime').datepicker('setDate', new Date(end.format('YYYY/MM/DD HH:mm:ss')));

                return false;
            },

            // Translations
            monthNames: [
                lang('january'),
                lang('february'),
                lang('march'),
                lang('april'),
                lang('may'),
                lang('june'),
                lang('july'),
                lang('august'),
                lang('september'),
                lang('october'),
                lang('november'),
                lang('december')
            ],
            monthNamesShort: [
                lang('january').substr(0, 3),
                lang('february').substr(0, 3),
                lang('march').substr(0, 3),
                lang('april').substr(0, 3),
                lang('may').substr(0, 3),
                lang('june').substr(0, 3),
                lang('july').substr(0, 3),
                lang('august').substr(0, 3),
                lang('september').substr(0, 3),
                lang('october').substr(0, 3),
                lang('november').substr(0, 3),
                lang('december').substr(0, 3)
            ],
            dayNames: [
                lang('sunday'),
                lang('monday'),
                lang('tuesday'),
                lang('wednesday'),
                lang('thursday'),
                lang('friday'),
                lang('saturday')
            ],
            dayNamesShort: [
                lang('sunday').substr(0, 3),
                lang('monday').substr(0, 3),
                lang('tuesday').substr(0, 3),
                lang('wednesday').substr(0, 3),
                lang('thursday').substr(0, 3),
                lang('friday').substr(0, 3),
                lang('saturday').substr(0, 3)
            ],
            dayNamesMin: [
                lang('sunday').substr(0, 2),
                lang('monday').substr(0, 2),
                lang('tuesday').substr(0, 2),
                lang('wednesday').substr(0, 2),
                lang('thursday').substr(0, 2),
                lang('friday').substr(0, 2),
                lang('saturday').substr(0, 2)
            ],
            buttonText: {
                today: lang('today'),
                day: lang('day'),
                week: lang('week'),
                month: lang('month')
            },

            // Calendar events need to be declared on initialization.
            windowResize: calendarWindowResize,
            viewRender: calendarViewRender,
            dayClick: calendarDayClick,
            eventClick: calendarEventClick,
            eventResize: calendarEventResize,
            eventDrop: calendarEventDrop,
            eventAfterAllRender: convertTitlesToHtml
        });

        // Trigger once to set the proper footer position after calendar initialization.
        calendarWindowResize();

        // Fill the select list boxes of the page.
        if (vars('available_providers').length > 0) {
            $('<optgroup/>', {
                'label': lang('providers'),
                'type': 'providers-group',
                'html': vars('available_providers').map((availableProvider) => {
                    const hasGoogleSync = availableProvider.settings.google_sync === '1' ? 'true' : 'false';

                    return $('<option/>', {
                        'value': availableProvider.id,
                        'type': FILTER_TYPE_PROVIDER,
                        'google-sync': hasGoogleSync,
                        'text': availableProvider.first_name + ' ' + availableProvider.last_name
                    });
                })
            }).appendTo('#select-filter-item');
        }

        if (vars('available_services').length > 0) {
            $('<optgroup/>', {
                'label': lang('services'),
                'type': 'services-group',
                'html': vars('available_services').map((availableService) =>
                    $('<option/>', {
                        'value': availableService.id,
                        'type': FILTER_TYPE_SERVICE,
                        'text': availableService.name
                    })
                )
            }).appendTo('#select-filter-item');
        }

        // Check permissions.
        if (vars('role_slug') === App.Layouts.Backend.DB_SLUG_PROVIDER) {
            $selectFilterItem
                .find('optgroup:eq(0)')
                .find('option[value="' + vars('user_id') + '"]')
                .prop('selected', true);
            $selectFilterItem.prop('disabled', true);
        }

        if (vars('role_slug') === App.Layouts.Backend.DB_SLUG_SECRETARY) {
            // Remove the providers that are not connected to the secretary.
            $selectFilterItem.find('optgroup:eq(1)').remove();

            $selectFilterItem.find('option[type="provider"]').each((index, option) => {
                const provider = vars('secretary_providers').find(
                    (secretaryProviderId) => Number($(option).val()) === Number(secretaryProviderId)
                );

                if (!provider) {
                    $(option).remove();
                }
            });

            if (!$selectFilterItem.find('option[type="provider"]').length) {
                $selectFilterItem('optgroup[type="providers-group"]').remove();
            }
        }

        // Add the page event listeners.
        addEventListeners();

        $selectFilterItem.trigger('change');

        // Display the edit dialog if an appointment hash is provided.
        if (vars('edit_appointment')) {
            const appointment = vars('edit_appointment');

            App.Components.AppointmentsModal.resetModal();

            $appointmentsModal.find('.modal-header h3').text(lang('edit_appointment_title'));
            $appointmentsModal.find('#appointment-id').val(appointment.id);
            $appointmentsModal.find('#select-service').val(appointment.id_services).trigger('change');
            $appointmentsModal.find('#select-provider').val(appointment.id_users_provider);

            // Set the start and end datetime of the appointment.
            const startDatetimeMoment = moment(appointment.start_datetime);
            $appointmentsModal.find('#start-datetime').datetimepicker('setDate', startDatetimeMoment.toDate());

            const endDatetimeMoment = moment(appointment.end_datetime);
            $appointmentsModal.find('#end-datetime').datetimepicker('setDate', endDatetimeMoment.toDate());

            const customer = appointment.customer;
            $appointmentsModal.find('#customer-id').val(appointment.id_users_customer);
            $appointmentsModal.find('#first-name').val(customer.first_name);
            $appointmentsModal.find('#last-name').val(customer.last_name);
            $appointmentsModal.find('#email').val(customer.email);
            $appointmentsModal.find('#phone-number').val(customer.phone_number);
            $appointmentsModal.find('#address').val(customer.address);
            $appointmentsModal.find('#city').val(customer.city);
            $appointmentsModal.find('#zip-code').val(customer.zip_code);
            $appointmentsModal.find('#appointment-location').val(appointment.location);
            $appointmentsModal.find('#appointment-notes').val(appointment.notes);
            $appointmentsModal.find('#customer-notes').val(customer.notes);

            $appointmentsModal.modal('show');

            $calendar.fullCalendar('gotoDate', moment(appointment.start_datetime));
        }

        if (!$selectFilterItem.find('option').length) {
            $('#calendar-actions button').prop('disabled', true);
        }

        // Fine tune the footer's position only for this page.
        if (window.innerHeight < 700) {
            $footer.css('position', 'static');
        }

        // Automatically refresh the calendar page every 10 seconds (without loading animation).
        setInterval(() => {
            const calendarView = $calendar.fullCalendar('getView');

            refreshCalendarAppointments(
                $calendar,
                $selectFilterItem.val(),
                $selectFilterItem.find('option:selected').attr('type'),
                calendarView.start,
                calendarView.end
            );
        }, 60000);
    }

    return {
        initialize
    };
})();
