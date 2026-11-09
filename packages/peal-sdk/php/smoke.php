<?php

// The smoke test, which scripts/test.ts runs against a stand-in API: the
// health check, the signed-in user with a bearer token, and the error a
// refused token raises.

require __DIR__ . '/vendor/autoload.php';

use Peal\Exceptions\PealApiException;
use Peal\PealClient;

$baseUrl = getenv('PEAL_API_URL');
$peal = new PealClient(token: 'peal_test', options: ['baseUrl' => $baseUrl]);

$peal->system->health();
$me = $peal->session->me();

if (
    $me->user->email !== 'ada@example.test'
    || $me->impersonatedBy !== null
    || $me->user->image !== null
    || !in_array('post:schedule', $me->workspaces[0]->permissions, true)
) {
    throw new RuntimeException('Unexpected answer: ' . $me->toJson());
}

try {
    (new PealClient(token: 'refused', options: ['baseUrl' => $baseUrl]))->session->me();
    throw new RuntimeException('A refused token got an answer');
} catch (PealApiException $error) {
    if ($error->getCode() !== 401) {
        throw $error;
    }
}

echo "ok\n";
