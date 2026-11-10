<?php

namespace Peal\Review\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ResolveReviewRequest extends JsonSerializableType
{
    /**
     * @var bool $resolved
     */
    #[JsonProperty('resolved')]
    public bool $resolved;

    /**
     * @param array{
     *   resolved: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->resolved = $values['resolved'];
    }
}
