# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module MastodonQuotePolicy
      extend Peal::Internal::Types::Enum

      PUBLIC = "public"
      FOLLOWERS = "followers"
      NOBODY = "nobody"
    end
  end
end
