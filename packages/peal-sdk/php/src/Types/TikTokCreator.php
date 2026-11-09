<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class TikTokCreator extends JsonSerializableType
{
    /**
     * @var ?string $avatarUrl
     */
    #[JsonProperty('avatarUrl')]
    public ?string $avatarUrl;

    /**
     * @var bool $commentDisabled
     */
    #[JsonProperty('commentDisabled')]
    public bool $commentDisabled;

    /**
     * @var bool $duetDisabled
     */
    #[JsonProperty('duetDisabled')]
    public bool $duetDisabled;

    /**
     * @var ?int $maxVideoDurationMs
     */
    #[JsonProperty('maxVideoDurationMs')]
    public ?int $maxVideoDurationMs;

    /**
     * @var string $nickname
     */
    #[JsonProperty('nickname')]
    public string $nickname;

    /**
     * @var array<value-of<TikTokPrivacyLevel>> $privacyLevels
     */
    #[JsonProperty('privacyLevels'), ArrayType(['string'])]
    public array $privacyLevels;

    /**
     * @var bool $stitchDisabled
     */
    #[JsonProperty('stitchDisabled')]
    public bool $stitchDisabled;

    /**
     * @var string $username
     */
    #[JsonProperty('username')]
    public string $username;

    /**
     * @param array{
     *   commentDisabled: bool,
     *   duetDisabled: bool,
     *   nickname: string,
     *   privacyLevels: array<value-of<TikTokPrivacyLevel>>,
     *   stitchDisabled: bool,
     *   username: string,
     *   avatarUrl?: ?string,
     *   maxVideoDurationMs?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->avatarUrl = $values['avatarUrl'] ?? null;
        $this->commentDisabled = $values['commentDisabled'];
        $this->duetDisabled = $values['duetDisabled'];
        $this->maxVideoDurationMs = $values['maxVideoDurationMs'] ?? null;
        $this->nickname = $values['nickname'];
        $this->privacyLevels = $values['privacyLevels'];
        $this->stitchDisabled = $values['stitchDisabled'];
        $this->username = $values['username'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
