<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class ApiChangelog extends JsonSerializableType
{
    /**
     * @var array<ApiChangelogEntry> $entries
     */
    #[JsonProperty('entries'), ArrayType([ApiChangelogEntry::class])]
    public array $entries;

    /**
     * @param array{
     *   entries: array<ApiChangelogEntry>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->entries = $values['entries'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
