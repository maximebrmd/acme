# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantActionWrite < Internal::Types::Model
      field :language, -> { Peal::Types::TranslationLanguage }, optional: true, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: true, nullable: false

      field :tone, -> { Peal::Types::AssistantTone }, optional: true, nullable: false
    end
  end
end
