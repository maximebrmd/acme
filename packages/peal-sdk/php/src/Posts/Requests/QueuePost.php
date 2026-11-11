<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class QueuePost extends JsonSerializableType
{
    /**
     * @var ?array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public ?array $channelIds;

    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

    /**
     * @param array{
     *   channelIds?: ?array<string>,
     *   queueId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelIds = $values['channelIds'] ?? null;
        $this->queueId = $values['queueId'] ?? null;
    }
}
