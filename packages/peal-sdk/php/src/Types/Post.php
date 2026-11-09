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
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var ?value-of<PostOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public ?string $outcome;

    /**
     * @var ?PostSchedule $schedule
     */
    #[JsonProperty('schedule')]
    public ?PostSchedule $schedule;

    /**
     * @var value-of<PostStatus> $status
     */
    #[JsonProperty('status')]
    public string $status;

    /**
     * @var array<PostTarget> $targets
     */
    #[JsonProperty('targets'), ArrayType([PostTarget::class])]
    public array $targets;

    /**
     * @param array{
     *   content: PostContent,
     *   id: string,
     *   status: value-of<PostStatus>,
     *   targets: array<PostTarget>,
     *   authorId?: ?string,
     *   outcome?: ?value-of<PostOutcome>,
     *   schedule?: ?PostSchedule,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->authorId = $values['authorId'] ?? null;
        $this->content = $values['content'];
        $this->id = $values['id'];
        $this->outcome = $values['outcome'] ?? null;
        $this->schedule = $values['schedule'] ?? null;
        $this->status = $values['status'];
        $this->targets = $values['targets'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
