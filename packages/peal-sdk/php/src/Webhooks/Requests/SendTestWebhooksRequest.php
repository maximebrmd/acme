<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\SubscribableWebhookEventType;

class SendTestWebhooksRequest extends JsonSerializableType
{
    /**
     * @var ?value-of<SubscribableWebhookEventType> $eventType
     */
    public ?string $eventType;

    /**
     * @param array{
     *   eventType?: ?value-of<SubscribableWebhookEventType>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->eventType = $values['eventType'] ?? null;
    }
}
