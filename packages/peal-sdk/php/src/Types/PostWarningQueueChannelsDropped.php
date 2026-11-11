<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostWarningQueueChannelsDropped extends JsonSerializableType
{
    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var string $queueId
     */
    #[JsonProperty('queueId')]
    public string $queueId;

    /**
     * @var string $queueName
     */
    #[JsonProperty('queueName')]
    public string $queueName;

    /**
     * @param array{
     *   channelIds: array<string>,
     *   queueId: string,
     *   queueName: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelIds = $values['channelIds'];
        $this->queueId = $values['queueId'];
        $this->queueName = $values['queueName'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
