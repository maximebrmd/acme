<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CommentSelection extends JsonSerializableType
{
    /**
     * @var ?CommentSelectionLocated $located
     */
    #[JsonProperty('located')]
    public ?CommentSelectionLocated $located;

    /**
     * @var string $quote
     */
    #[JsonProperty('quote')]
    public string $quote;

    /**
     * @var int $start
     */
    #[JsonProperty('start')]
    public int $start;

    /**
     * @param array{
     *   quote: string,
     *   start: int,
     *   located?: ?CommentSelectionLocated,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->located = $values['located'] ?? null;
        $this->quote = $values['quote'];
        $this->start = $values['start'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
