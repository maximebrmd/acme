# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantActionTranslate < Internal::Types::Model
      field :language, -> { Peal::Types::TranslationLanguage }, optional: false, nullable: false
    end
  end
end
