<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Notice extends JsonSerializableType
{
    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var NoticeEvent $event
     */
    #[JsonProperty('event')]
    public NoticeEvent $event;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?string $readAt
     */
    #[JsonProperty('readAt')]
    public ?string $readAt;

    /**
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   createdAt: string,
     *   event: NoticeEvent,
     *   id: string,
     *   workspaceId: string,
     *   readAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->createdAt = $values['createdAt'];
        $this->event = $values['event'];
        $this->id = $values['id'];
        $this->readAt = $values['readAt'] ?? null;
        $this->workspaceId = $values['workspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
