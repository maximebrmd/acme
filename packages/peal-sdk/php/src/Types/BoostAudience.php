<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

/**
 * Who a boost is shown to: people in some countries (ISO 3166-1 alpha-2 codes in capitals, 25 at most), between two ages (18 to 65, 65 meaning "65 and over"). Nothing finer.
 */
class BoostAudience extends JsonSerializableType
{
    /**
     * @var int $ageMax
     */
    #[JsonProperty('ageMax')]
    public int $ageMax;

    /**
     * @var int $ageMin
     */
    #[JsonProperty('ageMin')]
    public int $ageMin;

    /**
     * @var array<string> $countries
     */
    #[JsonProperty('countries'), ArrayType(['string'])]
    public array $countries;

    /**
     * @param array{
     *   ageMax: int,
     *   ageMin: int,
     *   countries: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->ageMax = $values['ageMax'];
        $this->ageMin = $values['ageMin'];
        $this->countries = $values['countries'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
