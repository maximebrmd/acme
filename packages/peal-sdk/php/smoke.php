<?php

// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, then the signed-in user with a bearer token.

require __DIR__ . '/vendor/autoload.php';

$config = Peal\Configuration::getDefaultConfiguration()
    ->setHost(getenv('PEAL_API_URL'))
    ->setAccessToken('peal_test');
$client = new GuzzleHttp\Client();

(new Peal\Api\SystemApi($client, $config))->health();
$me = (new Peal\Api\SessionApi($client, $config))->sessionMe();

if (
    $me->getUser()->getEmail() !== 'ada@example.test'
    || $me->getImpersonatedBy() !== null
    || $me->getUser()->getImage() !== null
    || !in_array('post:schedule', $me->getWorkspaces()[0]->getPermissions(), true)
) {
    fwrite(STDERR, 'Unexpected answer: ' . $me . PHP_EOL);
    exit(1);
}

echo "ok\n";
