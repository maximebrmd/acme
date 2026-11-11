<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class WebhookRedeliveryOfFailed extends JsonSerializableType
{
    /**
     * @var string $endpointId
     */
    #[JsonProperty('endpointId')]
    public string $endpointId;

    /**
     * @var ?value-of<SubscribableWebhookEventType> $eventType
     */
    #[JsonProperty('eventType')]
    public ?string $eventType;

    /**
     * @var ?string $since
     */
    #[JsonProperty('since')]
    public ?string $since;

    /**
     * @var ?string $until
     */
    #[JsonProperty('until')]
    public ?string $until;

    /**
     * @param array{
     *   endpointId: string,
     *   eventType?: ?value-of<SubscribableWebhookEventType>,
     *   since?: ?string,
     *   until?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->endpointId = $values['endpointId'];
        $this->eventType = $values['eventType'] ?? null;
        $this->since = $values['since'] ?? null;
        $this->until = $values['until'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
