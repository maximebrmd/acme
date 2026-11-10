<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\NewBoost;

class CreateBoostAdsRequest extends JsonSerializableType
{
    /**
     * @var string $idempotencyKey
     */
    public string $idempotencyKey;

    /**
     * @var NewBoost $body
     */
    public NewBoost $body;

    /**
     * @param array{
     *   idempotencyKey: string,
     *   body: NewBoost,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'];
        $this->body = $values['body'];
    }
}
