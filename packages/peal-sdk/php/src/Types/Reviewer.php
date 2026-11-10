<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Reviewer extends JsonSerializableType
{
    /**
     * @var value-of<ReviewerKind> $kind
     */
    #[JsonProperty('kind')]
    public string $kind;

    /**
     * @var ?string $linkId
     */
    #[JsonProperty('linkId')]
    public ?string $linkId;

    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?string $userId
     */
    #[JsonProperty('userId')]
    public ?string $userId;

    /**
     * @param array{
     *   kind: value-of<ReviewerKind>,
     *   linkId?: ?string,
     *   name?: ?string,
     *   userId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->kind = $values['kind'];
        $this->linkId = $values['linkId'] ?? null;
        $this->name = $values['name'] ?? null;
        $this->userId = $values['userId'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
