<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * How a post goes out on an Instagram account. Scheduling needs none of them; `format` `story` makes it a story, sent without the post's text and taking none of the other options; `shareToFeed`, `coverMediaId`, `thumbOffsetMs`, `audioName` and `trialReel` are for a post of one video (a reel), and each of `collaborators` receives an invitation.
 */
class InstagramOptions extends JsonSerializableType
{
    /**
     * @var ?string $audioName
     */
    #[JsonProperty('audioName')]
    public ?string $audioName;

    /**
     * @var ?array<string> $collaborators
     */
    #[JsonProperty('collaborators'), ArrayType(['string'])]
    public ?array $collaborators;

    /**
     * @var ?string $coverMediaId
     */
    #[JsonProperty('coverMediaId')]
    public ?string $coverMediaId;

    /**
     * @var ?value-of<InstagramFormat> $format
     */
    #[JsonProperty('format')]
    public ?string $format;

    /**
     * @var ?bool $shareToFeed
     */
    #[JsonProperty('shareToFeed')]
    public ?bool $shareToFeed;

    /**
     * @var ?int $thumbOffsetMs
     */
    #[JsonProperty('thumbOffsetMs')]
    public ?int $thumbOffsetMs;

    /**
     * @var ?value-of<InstagramTrialReel> $trialReel
     */
    #[JsonProperty('trialReel')]
    public ?string $trialReel;

    /**
     * @param array{
     *   audioName?: ?string,
     *   collaborators?: ?array<string>,
     *   coverMediaId?: ?string,
     *   format?: ?value-of<InstagramFormat>,
     *   shareToFeed?: ?bool,
     *   thumbOffsetMs?: ?int,
     *   trialReel?: ?value-of<InstagramTrialReel>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->audioName = $values['audioName'] ?? null;
        $this->collaborators = $values['collaborators'] ?? null;
        $this->coverMediaId = $values['coverMediaId'] ?? null;
        $this->format = $values['format'] ?? null;
        $this->shareToFeed = $values['shareToFeed'] ?? null;
        $this->thumbOffsetMs = $values['thumbOffsetMs'] ?? null;
        $this->trialReel = $values['trialReel'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
