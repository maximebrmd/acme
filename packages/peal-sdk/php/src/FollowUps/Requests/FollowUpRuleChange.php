<?php

namespace Peal\FollowUps\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FollowUpRuleChange extends JsonSerializableType
{
    /**
     * @var ?string $comment
     */
    #[JsonProperty('comment')]
    public ?string $comment;

    /**
     * @var ?int $likes
     */
    #[JsonProperty('likes')]
    public ?int $likes;

    /**
     * @var ?bool $paused
     */
    #[JsonProperty('paused')]
    public ?bool $paused;

    /**
     * @var ?bool $repost
     */
    #[JsonProperty('repost')]
    public ?bool $repost;

    /**
     * @param array{
     *   comment?: ?string,
     *   likes?: ?int,
     *   paused?: ?bool,
     *   repost?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->comment = $values['comment'] ?? null;
        $this->likes = $values['likes'] ?? null;
        $this->paused = $values['paused'] ?? null;
        $this->repost = $values['repost'] ?? null;
    }
}
