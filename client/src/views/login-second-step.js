/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2022 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
 * Website: https://www.espocrm.com
 *
 * EspoCRM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * EspoCRM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EspoCRM. If not, see http://www.gnu.org/licenses/.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/

define('views/login-second-step', ['view'], function (Dep) {

    /**
     * @class
     * @name Class
     * @extends module:view.Class
     * @memberOf module:views/login-second-step
     */
    return Dep.extend(/** @lends module:views/login-second-step.Class# */{

        /** @inheritDoc */
        template: 'login-second-step',

        /** @inheritDoc */
        views: {
            footer: {
                el: 'body > footer',
                view: 'views/site/footer'
            },
        },

        /**
         * @type {?string}
         * @private
         */
        anotherUser: null,

        /** @private */
        isPopoverDestroyed: false,

        /** @inheritDoc */
        events: {
            'submit #login-form': function (e) {
                e.preventDefault();

                this.send();
            },
            'click [data-action="backToLogin"]': function () {
                this.trigger('back');
            },
            'keydown': function (e) {
                if (Espo.Utils.getKeyFromKeyEvent(e) === 'Control+Enter') {
                    e.preventDefault();

                    this.send();
                }
            },
        },

        /** @inheritDoc */
        data: function () {
            return {
                message: this.message,
            };
        },

        /** @inheritDoc */
        setup: function () {
            this.message = this.translate(this.options.loginData.message, 'messages', 'User');
            this.anotherUser = this.options.anotherUser || null;
        },

        /** @inheritDoc */
        afterRender: function () {
            this.$code = $('[data-name="field-code"]');
            this.$submit = this.$el.find('#btn-send');
        },

        /**
         * @private
         */
        send: function () {
            let code = this.$code
                .val()
                .trim()
                .replace(/\s/g, '');

            let userName = this.options.userName;
            let password = this.options.loginData.token || this.options.password;

            if (code === '') {
                this.processEmptyCode();

                return;
            }

            this.disableForm();

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            let authString = Base64.encode(userName  + ':' + password);

            let headers = {
                'Authorization': 'Basic ' + authString,
                'Espo-Authorization': authString,
                'Espo-Authorization-Code': code,
                'Espo-Authorization-Create-Token-Secret': 'true',
            };

            if (this.anotherUser !== null) {
                headers['X-Another-User'] = this.anotherUser;
            }

            Espo.Ajax
                .getRequest('App/user', {code: code}, {
                    login: true,
                    headers: headers,
                })
                .then(data => {
                    Espo.Ui.notify(false);

                    this.triggerLogin(userName, data);
                })
                .catch(xhr => {
                    this.undisableForm();

                    if (xhr.status === 401) {
                        this.onWrongCredentials();
                    }
                });
        },

        /**
         * Trigger login to proceed to the application.
         *
         * @public
         * @param {string} userName A username.
         * @param {Object.<string, *>} data Data returned from the `App/user` request.
         */
        triggerLogin: function (userName, data) {
            if (this.anotherUser) {
                data.anotherUser = this.anotherUser;
            }

            this.trigger('login', userName, data);
        },

        /**
         * @private
         */
        processEmptyCode: function () {
            this.isPopoverDestroyed = false;

            let $el = this.$code;

            let message = this.getLanguage().translate('codeIsRequired', 'messages', 'User');

            $el
                .popover({
                    placement: 'bottom',
                    container: 'body',
                    content: message,
                    trigger: 'manual',
                })
                .popover('show');

            let $cell = $el.closest('.form-group');

            $cell.addClass('has-error');

            $el.one('mousedown click', () => {
                $cell.removeClass('has-error');

                if (this.isPopoverDestroyed) {
                    return;
                }

                $el.popover('destroy');

                this.isPopoverDestroyed = true;
            });
        },

        /**
         * @private
         */
        onWrongCredentials: function () {
            let $cell = $('#login .form-group');

            $cell.addClass('has-error');

            this.$el.one('mousedown click', () => {
                $cell.removeClass('has-error');
            });

            Espo.Ui.error(this.translate('wrongCode', 'messages', 'User'));
        },

        /**
         * @public
         */
        disableForm: function () {
            this.$submit.addClass('disabled').attr('disabled', 'disabled');
        },

        /**
         * @public
         */
        undisableForm: function () {
            this.$submit.removeClass('disabled').removeAttr('disabled');
        },
    });
});
