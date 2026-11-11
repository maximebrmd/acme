# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module MastodonVisibility
      extend Peal::Internal::Types::Enum

      PUBLIC = "public"
      UNLISTED = "unlisted"
      PRIVATE = "private"
    end
  end
end
