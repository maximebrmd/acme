# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TextProviderKind
      extend Peal::Internal::Types::Enum

      ANTHROPIC = "anthropic"
      OPENAI_COMPATIBLE = "openai-compatible"
    end
  end
end
