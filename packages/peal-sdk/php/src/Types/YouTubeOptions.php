<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`.
 */
class YouTubeOptions extends JsonSerializableType
{
    /**
     * @var ?string $categoryId
     */
    #[JsonProperty('categoryId')]
    public ?string $categoryId;

    /**
     * @var ?bool $containsSyntheticMedia
     */
    #[JsonProperty('containsSyntheticMedia')]
    public ?bool $containsSyntheticMedia;

    /**
     * @var ?bool $madeForKids
     */
    #[JsonProperty('madeForKids')]
    public ?bool $madeForKids;

    /**
     * @var ?bool $notifySubscribers
     */
    #[JsonProperty('notifySubscribers')]
    public ?bool $notifySubscribers;

    /**
     * @var ?value-of<YouTubePrivacy> $privacy
     */
    #[JsonProperty('privacy')]
    public ?string $privacy;

    /**
     * @var ?array<string> $tags
     */
    #[JsonProperty('tags'), ArrayType(['string'])]
    public ?array $tags;

    /**
     * @var ?string $title
     */
    #[JsonProperty('title')]
    public ?string $title;

    /**
     * @param array{
     *   categoryId?: ?string,
     *   containsSyntheticMedia?: ?bool,
     *   madeForKids?: ?bool,
     *   notifySubscribers?: ?bool,
     *   privacy?: ?value-of<YouTubePrivacy>,
     *   tags?: ?array<string>,
     *   title?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->categoryId = $values['categoryId'] ?? null;
        $this->containsSyntheticMedia = $values['containsSyntheticMedia'] ?? null;
        $this->madeForKids = $values['madeForKids'] ?? null;
        $this->notifySubscribers = $values['notifySubscribers'] ?? null;
        $this->privacy = $values['privacy'] ?? null;
        $this->tags = $values['tags'] ?? null;
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
