<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

/**
 * How a post goes out on a Pinterest account, as a Pin. Scheduling needs `boardId`.
 */
class PinterestOptions extends JsonSerializableType
{
    /**
     * @var ?string $boardId
     */
    #[JsonProperty('boardId')]
    public ?string $boardId;

    /**
     * @var ?string $boardSectionId
     */
    #[JsonProperty('boardSectionId')]
    public ?string $boardSectionId;

    /**
     * @var ?int $coverSecond
     */
    #[JsonProperty('coverSecond')]
    public ?int $coverSecond;

    /**
     * @var ?string $dominantColor
     */
    #[JsonProperty('dominantColor')]
    public ?string $dominantColor;

    /**
     * @var ?string $link
     */
    #[JsonProperty('link')]
    public ?string $link;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @param array{
     *   boardId?: ?string,
     *   boardSectionId?: ?string,
     *   coverSecond?: ?int,
     *   dominantColor?: ?string,
     *   link?: ?string,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->boardId = $values['boardId'] ?? null;
        $this->boardSectionId = $values['boardSectionId'] ?? null;
        $this->coverSecond = $values['coverSecond'] ?? null;
        $this->dominantColor = $values['dominantColor'] ?? null;
        $this->link = $values['link'] ?? null;
        $this->title = $values['title'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
