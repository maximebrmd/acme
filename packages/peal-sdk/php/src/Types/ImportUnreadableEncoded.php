<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ImportUnreadableEncoded extends JsonSerializableType
{
    /**
     * @var value-of<ImportUnreadableEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var ?string $column
     */
    #[JsonProperty('column')]
    public ?string $column;

    /**
     * @var value-of<ImportProblem> $problem
     */
    #[JsonProperty('problem')]
    public string $problem;

    /**
     * @param array{
     *   tag: value-of<ImportUnreadableEncodedTag>,
     *   problem: value-of<ImportProblem>,
     *   column?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->column = $values['column'] ?? null;
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
