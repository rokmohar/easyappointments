FROM php:8.4-fpm

ARG ENABLE_XDEBUG=0

WORKDIR "/var/www/html"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        zip \
        unzip \
    && curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o - | sh -s \
        curl gd intl ldap mbstring mysqli odbc pdo pdo_mysql soap sockets xml zip exif sqlite3 gettext bcmath csv event imap inotify redis \
    && if [ "$ENABLE_XDEBUG" = "1" ]; then \
        echo "WARNING: XDebug is being installed. This should ONLY be used in development!"; \
        curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o - | sh -s xdebug; \
        docker-php-ext-enable xdebug; \
        echo "export XDEBUG_TRIGGER=1" >> /root/.bashrc; \
        echo "export PHP_IDE_CONFIG=\"serverName=host.docker.internal\"" >> /root/.bashrc; \
        sed -i 's/xdebug.mode = off/xdebug.mode = debug/' /usr/local/etc/php/conf.d/99-overrides.ini; \
       else \
        echo "XDebug disabled for security. Set ENABLE_XDEBUG=1 as build arg to enable in development."; \
       fi \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && curl -sLS https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get install -q -y ssmtp mailutils \
    && echo "hostname=localhost.localdomain" > /etc/ssmtp/ssmtp.conf \
    && echo "root=root@example.org" >> /etc/ssmtp/ssmtp.conf \
    && echo "mailhub=mailpit:1025" >> /etc/ssmtp/ssmtp.conf \
    && echo "sendmail_path=/usr/sbin/ssmtp -t" >> /usr/local/etc/php/conf.d/php-sendmail.ini \
    && echo "alias ll=\"ls -al\"" >> /root/.bashrc \
    && apt-get -y autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

CMD ["bash", "docker/php-fpm/start-container"]
