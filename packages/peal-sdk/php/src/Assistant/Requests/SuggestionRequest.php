<?php

namespace Peal\Assistant\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\AssistantAction;
use Peal\Core\Json\JsonProperty;

class SuggestionRequest extends JsonSerializableType
{
    /**
     * @var AssistantAction $action
     */
    #[JsonProperty('action')]
    public AssistantAction $action;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @param array{
     *   action: AssistantAction,
     *   text: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->action = $values['action'];
        $this->text = $values['text'];
    }
}
