<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Post extends JsonSerializableType
{
    /**
     * @var ?string $authorId
     */
    #[JsonProperty('authorId')]
    public ?string $authorId;

    /**
     * @var PostContent $content
     */
    #[JsonProperty('content')]
    public PostContent $content;

    /**
     * @var ?PostOrigin $createdVia
     */
    #[JsonProperty('createdVia')]
    public ?PostOrigin $createdVia;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?int $occurrence
     */
    #[JsonProperty('occurrence')]
    public ?int $occurrence;

    /**
     * @var ?value-of<PostOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public ?string $outcome;

    /**
     * @var ?string $queueId
     */
    #[JsonProperty('queueId')]
    public ?string $queueId;

    /**
     * @var ?string $recyclingId
     */
    #[JsonProperty('recyclingId')]
    public ?string $recyclingId;

    /**
     * @var ?PostSchedule $schedule
     */
    #[JsonProperty('schedule')]
    public ?PostSchedule $schedule;

    /**
     * @var ?string $scheduledBy
     */
    #[JsonProperty('scheduledBy')]
    public ?string $scheduledBy;

    /**
     * @var ?PostOrigin $scheduledVia
     */
    #[JsonProperty('scheduledVia')]
    public ?PostOrigin $scheduledVia;

    /**
     * @var value-of<PostStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var array<string> $tagIds
     */
    #[JsonProperty('tagIds'), ArrayType(['string'])]
    public array $tagIds;

    /**
     * @var array<PostTarget> $targets
     */
    #[JsonProperty('targets'), ArrayType([PostTarget::class])]
    public array $targets;

    /**
     * @var ?array<PostWarning> $warnings
     */
    #[JsonProperty('warnings'), ArrayType([PostWarning::class])]
    public ?array $warnings;

    /**
     * @param array{
     *   content: PostContent,
     *   id: string,
     *   status: value-of<PostStatus>,
     *   tagIds: array<string>,
     *   targets: array<PostTarget>,
     *   authorId?: ?string,
     *   createdVia?: ?PostOrigin,
     *   occurrence?: ?int,
     *   outcome?: ?value-of<PostOutcome>,
     *   queueId?: ?string,
     *   recyclingId?: ?string,
     *   schedule?: ?PostSchedule,
     *   scheduledBy?: ?string,
     *   scheduledVia?: ?PostOrigin,
     *   warnings?: ?array<PostWarning>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->content = $values['content'];
        $this->createdVia = $values['createdVia'] ?? null;
        $this->id = $values['id'];
        $this->occurrence = $values['occurrence'] ?? null;
        $this->outcome = $values['outcome'] ?? null;
        $this->queueId = $values['queueId'] ?? null;
        $this->recyclingId = $values['recyclingId'] ?? null;
        $this->schedule = $values['schedule'] ?? null;
        $this->scheduledBy = $values['scheduledBy'] ?? null;
        $this->scheduledVia = $values['scheduledVia'] ?? null;
        $this->status = $values['status'];
        $this->tagIds = $values['tagIds'];
        $this->targets = $values['targets'];
        $this->warnings = $values['warnings'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
