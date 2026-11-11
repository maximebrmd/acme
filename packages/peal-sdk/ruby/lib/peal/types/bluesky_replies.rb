# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module BlueskyReplies
      extend Peal::Internal::Types::Enum

      EVERYONE = "everyone"
      NOBODY = "nobody"
      LIMITED = "limited"
    end
  end
end
