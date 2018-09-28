# [w3c-test.org](http://w3c-test.org)

A redirection service from http://w3c-test.org to its successor,
http://web-platform-tests.live

## Getting Started

1. Download and install [VirtualBox](https://www.virtualbox.org/) and
   [Vagrant](https://www.vagrantup.com/) (version 2.1.5 or later)
2. Run `vagrant up` from the root of this repository
3. Visit http://172.30.1.6/ in a web browser

### Overview

The instructions for Ansible are stored in the `provisioning` directory. It
installs the required packages, copies the server into place, and configures
the system to run the server at all times.

The project uses [Certbot](https://certbot.eff.org/) to set up a [Let's
Encrypt](https://letsencrypt.org/) SSL certificate for each of the supported
domains. This list is hard-coded into the configuration files. Although the
domains supported by the web-platform-tests project may change over time, this
project's function as a redirection service makes it unnecessary to track those
changes.

### Production

This project is deployed to http://w3c-test.org. The necessary infrastructure
(e.g. server, DNS configuration, status monitoring) is provided by
[Bocoup](https://bocoup.com). It is managed in an external project,
[infrastructure-web-platform](https://github.com/bocoup/infrastructure-web-platform/tree/master/terraform/projects/web-platform-tests-live).

To access the production system, first request a copy of the
`web_platform_test_live.pem` file from infrastructure+web-platform@bocoup.com.
Using that, the following command will deploy this project to production:

    $ ansible-playbook playbook.yml -i inventory/production --key-file=path/to/web_platform_test_live.pem

### Monitoring

Monitoring is provided by AWS Cloudwatch. If the index page `/` returns a non
2XX or 3XX status for more then 1 minute, an e-mail will be sent to
infrastructure+web-platform@bocoup.com noting the website has entered the Alert
status.

### Development

This project uses Vagrant for local development. Running `vagrant up` should
create a Ubuntu virtual machine and configure it using the provisioning script.
If you need to debug the running server, you can log into it with the following
command:

    $ vagrant ssh

Once connected to the development server, the following commands can be used to
alter the status of the `wpt` service.

    # Check the status of the service
    $ systemctl status redirector

    ## Stop the service (it will be running by default)
    $ sudo systemctl stop redirector

    ## Start the service
    $ sudo systemctl start redirector

    # Check the logs emitted from the wpt service
    $ sudo journalctl -f -u redirector

You can use the following command to re-apply the configuration to the
development system:

    $ vagrant provision

To destroy the Vagrant machine and build a new one from scratch, you can
use the following command:

    $ vagrant destroy -f && vangrant up
