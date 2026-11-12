<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AgendaItem extends JsonSerializableType
{
    /**
     * @var string $excerpt
     */
    #[JsonProperty('excerpt')]
    public string $excerpt;

    /**
     * @var ?array<value-of<Platform>> $platforms
     */
    #[JsonProperty('platforms'), ArrayType(['string'])]
    public ?array $platforms;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $scheduledAt
     */
    #[JsonProperty('scheduledAt')]
    public string $scheduledAt;

    /**
     * @var value-of<PostStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   excerpt: string,
     *   postId: string,
     *   scheduledAt: string,
     *   status: value-of<PostStatus>,
     *   timeZone: string,
     *   workspaceId: string,
     *   platforms?: ?array<value-of<Platform>>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->excerpt = $values['excerpt'];
        $this->platforms = $values['platforms'] ?? null;
        $this->postId = $values['postId'];
        $this->scheduledAt = $values['scheduledAt'];
        $this->status = $values['status'];
        $this->timeZone = $values['timeZone'];
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
