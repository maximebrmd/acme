<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PostReview extends JsonSerializableType
{
    /**
     * @var array<ApprovalRequest> $approvals
     */
    #[JsonProperty('approvals'), ArrayType([ApprovalRequest::class])]
    public array $approvals;

    /**
     * @var array<ReviewedChannel> $channels
     */
    #[JsonProperty('channels'), ArrayType([ReviewedChannel::class])]
    public array $channels;

    /**
     * @var array<ReviewComment> $comments
     */
    #[JsonProperty('comments'), ArrayType([ReviewComment::class])]
    public array $comments;

    /**
     * @var array<ReviewedMedia> $media
     */
    #[JsonProperty('media'), ArrayType([ReviewedMedia::class])]
    public array $media;

    /**
     * @param array{
     *   approvals: array<ApprovalRequest>,
     *   channels: array<ReviewedChannel>,
     *   comments: array<ReviewComment>,
     *   media: array<ReviewedMedia>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->approvals = $values['approvals'];
        $this->channels = $values['channels'];
        $this->comments = $values['comments'];
        $this->media = $values['media'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
