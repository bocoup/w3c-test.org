# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = '2'

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = 'ubuntu/bionic64'
  config.vm.network "private_network", ip: "172.30.1.6"

  config.vm.synced_folder '.', '/vagrant'

  config.vm.provision 'ansible_local' do |ansible|
    ansible.provisioning_path = '/vagrant/provisioning'
    ansible.playbook = 'provision.yml'
    ansible.inventory_path = 'inventory/development.yml'
    ansible.limit = 'all'
  end
end
