<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CommentInvalidEncoded extends JsonSerializableType
{
    /**
     * @var value-of<CommentInvalidEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var value-of<CommentProblem> $problem
     */
    #[JsonProperty('problem')]
    public string $problem;

    /**
     * @param array{
     *   tag: value-of<CommentInvalidEncodedTag>,
     *   problem: value-of<CommentProblem>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->problem = $values['problem'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
