<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * How a post goes out on an Instagram account. Scheduling needs none of them; `shareToFeed`, `coverMediaId`, `thumbOffsetMs`, `audioName` and `trialReel` are for a post of one video (a reel), and each of `collaborators` receives an invitation.
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
