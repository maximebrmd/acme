# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AssistantTone
      extend Peal::Internal::Types::Enum

      PROFESSIONAL = "professional"
      FRIENDLY = "friendly"
      CASUAL = "casual"
      ENTHUSIASTIC = "enthusiastic"
      WITTY = "witty"
    end
  end
end
