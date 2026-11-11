<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class WebhookBulkRedelivery extends JsonSerializableType
{
    /**
     * @var array<WebhookDelivery> $redelivered
     */
    #[JsonProperty('redelivered'), ArrayType([WebhookDelivery::class])]
    public array $redelivered;

    /**
     * @var int $remaining
     */
    #[JsonProperty('remaining')]
    public int $remaining;

    /**
     * @var array<WebhookRedeliverySkipped> $skipped
     */
    #[JsonProperty('skipped'), ArrayType([WebhookRedeliverySkipped::class])]
    public array $skipped;

    /**
     * @param array{
     *   redelivered: array<WebhookDelivery>,
     *   remaining: int,
     *   skipped: array<WebhookRedeliverySkipped>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->redelivered = $values['redelivered'];
        $this->remaining = $values['remaining'];
        $this->skipped = $values['skipped'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
