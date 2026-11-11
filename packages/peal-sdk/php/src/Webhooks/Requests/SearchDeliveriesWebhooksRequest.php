<?php

namespace Peal\Webhooks\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\WebhookEventType;
use Peal\Types\WebhookDeliveryStatus;

class SearchDeliveriesWebhooksRequest extends JsonSerializableType
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
     * @var ?string $endpointId
     */
    public ?string $endpointId;

    /**
     * @var ?string $since
     */
    public ?string $since;

    /**
     * @var ?string $until
     */
    public ?string $until;

    /**
     * @param array{
     *   cursor?: ?string,
     *   limit?: ?string,
     *   eventType?: ?value-of<WebhookEventType>,
     *   status?: ?value-of<WebhookDeliveryStatus>,
     *   endpointId?: ?string,
     *   since?: ?string,
     *   until?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->eventType = $values['eventType'] ?? null;
        $this->status = $values['status'] ?? null;
        $this->endpointId = $values['endpointId'] ?? null;
        $this->since = $values['since'] ?? null;
        $this->until = $values['until'] ?? null;
    }
}
