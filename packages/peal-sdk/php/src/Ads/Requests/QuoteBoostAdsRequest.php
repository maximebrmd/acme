<?php

namespace Peal\Ads\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\NewBoost;

class QuoteBoostAdsRequest extends JsonSerializableType
{
    /**
     * @var NewBoost $body
     */
    public NewBoost $body;

    /**
     * @param array{
     *   body: NewBoost,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->body = $values['body'];
    }
}
