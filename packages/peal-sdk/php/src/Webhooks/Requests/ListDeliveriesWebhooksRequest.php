<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\WebhookEventType;
use Peal\Types\WebhookDeliveryStatus;

class ListDeliveriesWebhooksRequest extends JsonSerializableType
{
    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?value-of<WebhookEventType> $eventType
     */
    public ?string $eventType;

    /**
     * @var ?value-of<WebhookDeliveryStatus> $status
     */
    public ?string $status;

    /**
     * @param array{
     *   cursor?: ?string,
     *   limit?: ?string,
     *   eventType?: ?value-of<WebhookEventType>,
     *   status?: ?value-of<WebhookDeliveryStatus>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->eventType = $values['eventType'] ?? null;
        $this->status = $values['status'] ?? null;
    }
}
