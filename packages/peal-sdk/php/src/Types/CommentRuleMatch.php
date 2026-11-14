<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CommentRuleMatch extends JsonSerializableType
{
    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var string $commentId
     */
    #[JsonProperty('commentId')]
    public string $commentId;

    /**
     * @var string $lookedAt
     */
    #[JsonProperty('lookedAt')]
    public string $lookedAt;

    /**
     * @var value-of<CommentRuleOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public string $outcome;

    /**
     * @var ?string $replyId
     */
    #[JsonProperty('replyId')]
    public ?string $replyId;

    /**
     * @param array{
     *   commentId: string,
     *   lookedAt: string,
     *   outcome: value-of<CommentRuleOutcome>,
     *   code?: ?string,
     *   replyId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'] ?? null;
        $this->commentId = $values['commentId'];
        $this->lookedAt = $values['lookedAt'];
        $this->outcome = $values['outcome'];
        $this->replyId = $values['replyId'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
