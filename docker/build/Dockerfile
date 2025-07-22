FROM php:8.4-apache

WORKDIR /var/www/html

ARG VERSION

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

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        zip \
        unzip \
        libfreetype-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        ssmtp \
        mailutils \
    && curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o - | sh -s \
        curl gd intl ldap mbstring mysqli odbc pdo pdo_mysql soap sockets xml zip exif sqlite3 gettext bcmath csv imap redis event inotify \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && curl -sLS https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && echo "sendmail_path=/usr/sbin/ssmtp -t" >> /usr/local/etc/php/conf.d/php-sendmail.ini \
    && a2enmod rewrite \
    && apt-get -y autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY . .

COPY docker/build/apache2/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/build/php/99-overrides.ini /usr/local/etc/php/conf.d/99-overrides.ini

COPY docker/build/start-container /usr/local/bin/start-container
RUN chmod +x /usr/local/bin/start-container

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80

CMD ["/usr/local/bin/start-container"]
