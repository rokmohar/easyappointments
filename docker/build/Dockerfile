FROM php:8.2-apache

ARG VERSION
ARG ENABLE_XDEBUG=0

ENV BASE_URL="http://localhost"
ENV LANGUAGE="english"
ENV DEBUG_MODE="FALSE"
ENV DB_HOST="db"
ENV DB_NAME="easyappointments"
ENV DB_USERNAME="root"
ENV DB_PASSWORD="secret"
ENV GOOGLE_SYNC_FEATURE=FALSE
ENV GOOGLE_PRODUCT_NAME=""
ENV GOOGLE_CLIENT_ID=""
ENV GOOGLE_CLIENT_SECRET=""
ENV GOOGLE_API_KEY=""
ENV SMTP_HOST="smtp.example.org"
ENV SMTP_PORT="587"
ENV SMTP_AUTH="1"
ENV SMTP_USERNAME=""
ENV SMTP_PASSWORD=""
ENV SMTP_FROM_ADDRESS="info@example.org"
ENV SMTP_FROM_NAME="Example"
ENV SMTP_REPLY_TO_ADDRESS="info@example.org"
ENV SMTP_PROTOCOL="tls"
ENV SMTP_TLS="YES"

EXPOSE 80

WORKDIR /var/www/html

COPY docker/build/99-overrides.ini /usr/local/etc/php/conf.d

COPY docker/build/docker-entrypoint.sh /usr/local/bin

COPY . .

RUN apt-get update \
    && apt-get install -y libfreetype-dev libjpeg62-turbo-dev libpng-dev wget nano ssmtp mailutils \
	&& curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o - | sh -s \
      curl gd intl ldap mbstring mysqli odbc pdo pdo_mysql xml zip exif gettext bcmath csv event imap inotify mcrypt redis \
    && if [ "$ENABLE_XDEBUG" = "1" ]; then \
        echo "WARNING: XDebug is being installed. This should ONLY be used in development!"; \
        curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o - | sh -s xdebug; \
        docker-php-ext-enable xdebug; \
        echo "xdebug.mode = debug" >> /usr/local/etc/php/conf.d/99-overrides.ini; \
       else \
        echo "XDebug disabled for security. Use ENABLE_XDEBUG=1 build arg to enable in development."; \
       fi \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && curl -sLS https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && echo "sendmail_path=/usr/sbin/ssmtp -t" >> /usr/local/etc/php/conf.d/php-sendmail.ini \
    && echo "alias ll=\"ls -al\"" >> /root/.bashrc \
    && apt-get -y autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && chown -R www-data:www-data .

ENTRYPOINT ["bash", "./docker/build/docker-entrypoint.sh"]
