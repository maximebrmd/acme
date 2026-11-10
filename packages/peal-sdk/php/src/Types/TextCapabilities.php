<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class TextCapabilities extends JsonSerializableType
{
    /**
     * @var array<string> $forbiddenCharacters
     */
    #[JsonProperty('forbiddenCharacters'), ArrayType(['string'])]
    public array $forbiddenCharacters;

    /**
     * @var array<TextLimit> $limits
     */
    #[JsonProperty('limits'), ArrayType([TextLimit::class])]
    public array $limits;

    /**
     * @var ?int $maxHashtags
     */
    #[JsonProperty('maxHashtags')]
    public ?int $maxHashtags;

    /**
     * @var ?int $maxLinks
     */
    #[JsonProperty('maxLinks')]
    public ?int $maxLinks;

    /**
     * @var ?int $maxMentions
     */
    #[JsonProperty('maxMentions')]
    public ?int $maxMentions;

    /**
     * @param array{
     *   forbiddenCharacters: array<string>,
     *   limits: array<TextLimit>,
     *   maxHashtags?: ?int,
     *   maxLinks?: ?int,
     *   maxMentions?: ?int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->forbiddenCharacters = $values['forbiddenCharacters'];
        $this->limits = $values['limits'];
        $this->maxHashtags = $values['maxHashtags'] ?? null;
        $this->maxLinks = $values['maxLinks'] ?? null;
        $this->maxMentions = $values['maxMentions'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
