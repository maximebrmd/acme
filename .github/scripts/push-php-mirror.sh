#!/bin/sh
# Pushes the branch php-mirror (`git subtree split` of packages/peal-sdk/php)
# to peal-social/peal-php as the ref it is given: refs/heads/main, replaced
# as the folder's history is, or a release's refs/tags/v<version>, which
# never moves. It signs in with the deploy key in DEPLOY_KEY, and trusts only
# GitHub's published SSH host key.
set -eu

ref=$1
mirror=git@github.com:peal-social/peal-php.git
key="$RUNNER_TEMP/php-mirror-key"
hosts="$RUNNER_TEMP/php-mirror-known-hosts"

umask 077
trap 'rm -f "$key"' EXIT
printf '%s\n' "$DEPLOY_KEY" > "$key"
# https://api.github.com/meta, ssh_keys
printf '%s\n' 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl' > "$hosts"

GIT_SSH_COMMAND="ssh -i $key -o IdentitiesOnly=yes -o UserKnownHostsFile=$hosts -o StrictHostKeyChecking=yes"
export GIT_SSH_COMMAND

case $ref in
  refs/heads/*) git push --force "$mirror" "php-mirror:$ref" ;;
  *) git push "$mirror" "php-mirror:$ref" ;;
esac
